import 'source-map-support/register';
import { Config } from './config';
import { getDataUrlFromBlob, requireString } from './string';
import * as Smart from './smartProgress';
import { smartProgressHost, smartProgressUrl, Comment } from './smartProgress';
import fs from 'fs';
import { GoalHeader } from './goalInfo';
import { DatabaseSync } from 'node:sqlite';
import { DateTime } from 'luxon';

const REGEXP_GOAL_TITLE = /<title>(.*?)<\/title>/g;

interface GetCommentsResponse {
    /** Should be "success" */
    status: string;
    comments: Comment[];
}

class App {
    private db: DatabaseSync;

    constructor(private config: Config) {
        fs.mkdirSync(this.dataDirectory, { recursive: true });
        this.db = new DatabaseSync(this.dataDirectory + '/hinst-website.db');
        this.db.exec('PRAGMA journal_mode=WAL;');
        this.db.exec(`PRAGMA busy_timeout=${1000 * 60 * 5};`);
        this.db.exec(fs.readFileSync('schema.sql').toString());
    }

    private get dataDirectory(): string {
        return 'data';
    }

    async run() {
        const goalIds = this.config.goalId.split(',');
        for (const goalId of goalIds) {
            try {
                await this.readGoal(goalId);
            } catch (e) {
                console.error('Cannot read goal ' + goalId, e);
            }
        }
    }

    private async readGoal(goalId: string) {
        const goalTitle = await this.readGoalTitle(goalId);
        let goalAuthor = '';
        const postCount = await this.processGoalPosts(goalId, (post: Smart.Post) => {
            if (post.type === 'post')
                goalAuthor = post.username;
            this.savePost(goalId, post);
        });
        this.saveGoalHeader(
            new GoalHeader(
                goalId,
                goalTitle,
                postCount,
                new Date().toISOString(),
                goalAuthor
            )
        );
    }

    private saveGoalHeader(header: GoalHeader) {
        const goalDirectory = this.dataDirectory + '/' + header.id;
        fs.mkdirSync(goalDirectory, { recursive: true });
        fs.writeFileSync(goalDirectory + '/_header.json', JSON.stringify(header, null, '\t'));
    }

    private savePost(goalId: string, post: Smart.Post) {
        const goalIdInt = parseInt(goalId);
        if (isNaN(goalIdInt))
            throw new Error('Cannot parse integer from goalId' + goalId);
        const dateEpoch = DateTime.fromSQL(post.date).toUTC().toSeconds();

        const insertPost = this.db.prepare(
            'INSERT INTO goalPosts (goalId, dateTime, type, htmlText) VALUES (?, ?, ?, ?)' +
            ' ON CONFLICT(goalId, dateTime) DO UPDATE SET type = excluded.type, htmlText = excluded.htmlText'
        );
        insertPost.run(goalIdInt, dateEpoch, post.type, post.msg);

        if (post.images?.length)
            for (const image of post.images) {
                const insertImage = this.db.prepare(
                    'INSERT INTO goalPostImages (goalId, parentDateTime, contentType, file) VALUES (?, ?, ?, ?)' +
                    ' ON CONFLICT(goalId, parentDateTime, contentType, file) DO NOTHING'
                );
                insertImage.run(goalIdInt, dateEpoch, image.contentType, image.data);
            }
    }

    private async readGoalTitle(goalId: string) {
        const url = smartProgressUrl + '/goal/' + encodeURIComponent(goalId);
        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            throw new Error('Could not load goal title: ' + response.statusText + '\n' + text);
        }
        const html = await response.text();
        const title = html.matchAll(REGEXP_GOAL_TITLE).next().value?.[1];
        return title || '';
    }

    private async processGoalPosts(goalId: string, processPost: (post: Smart.Post) => void) {
        let startId = '0';
        let totalPostCount = 0;
        while (true) {
            const blogPosts = await this.readPosts(goalId, startId);
            if (blogPosts?.blog?.length) {
                const posts = blogPosts.blog;
                for (const post of posts) {
                    if (post.comments && post.comments.length < parseInt(post.count_comments)) {
                        post.comments = (await this.readComments(post.id)).comments;
                    }
                    if (post.images && post.images.length)
                        await this.readImages(post);
                }
                for (const post of posts)
                    processPost(post);
                totalPostCount += posts.length;
                startId = blogPosts.blog[blogPosts.blog.length - 1].id;
            } else
                break;
            break; // temporary for testing
        }
        return totalPostCount;
    }

    async readComments(postId: string): Promise<GetCommentsResponse> {
        const url = smartProgressUrl + '/blog/getComments?post_id=' + postId;
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                Host: smartProgressHost
            }
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error('Could not read comments: ' + response.statusText + '\n' + text);
        }
        return await response.json();
    }

    async readImages(post: Smart.Post) {
        for (const image of post.images) {
            const url = smartProgressUrl + image.url;
            const response = await fetch(url, {
                headers: {
                    Host: smartProgressHost
                }
            });
            image.contentType = response.headers.get('Content-Type') || '';
            const blob = await response.blob();
            image.data = await blob.bytes();
        }
    }

    private async readPosts(goalId: string, startId: string): Promise<Smart.Posts> {
        let url = smartProgressUrl + '/blog/getPosts';
        url += '?obj_id=' + goalId;
        url += '&sorting=old_top';
        url += '&start_id=' + startId;
        url += '&end_id=0';
        url += '&step_id=0'
        url += '&only_author=0';
        url += '&change_sorting=0';
        url += '&obj_type=0';
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                Host: smartProgressHost
            }
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error('Could not load blog posts: ' + response.statusText + '\n' + text);
        }
        const posts = await response.json();
        return posts;
    }
}

new App(new Config(
    requireString(process.env.goalId),
)).run();
