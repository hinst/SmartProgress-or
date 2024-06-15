import 'source-map-support/register';
import { Config } from './config';
import { getDataUrlFromBlob, requireString } from './string';
import * as Smart from './smartProgress';
import { smartProgressHost, smartProgressUrl, Comment } from './smartProgress';
import fs from 'fs';
import { GoalHeader, GoalInfo } from './goalInfo';

const REGEXP_GOAL_TITLE = /<title>(.*?)<\/title>/g;

interface GetCommentsResponse {
    /** Should be "success" */
    status: string;
    comments: Comment[];
}

class App {
    constructor(private config: Config) {
    }

    private get dataDir(): string {
        return 'data';
    }

    async run() {
        var goalIds = this.config.goalId.split(',');
        for (let goalId of goalIds) {
            try {
                await this.readGoal(goalId);
            } catch (e) {
                console.error('Cannot read goal ' + goalId, e);
            }
        }
    }

    private async readGoal(goalId: string) {
        fs.mkdirSync(this.dataDir, { recursive: true });
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
        const goalDir = this.dataDir + '/' + header.id;
        fs.mkdirSync(goalDir, { recursive: true });
        fs.writeFileSync(goalDir + '/_header.json', JSON.stringify(header, null, '\t'));
    }

    private savePost(goalId: string, post: Smart.Post) {
        const goalDir = this.dataDir + '/' + goalId;
        fs.mkdirSync(goalDir, { recursive: true });
        const fileFriendlyDate = post.date.replaceAll(' ', '_').replaceAll(':', '-');
        const postFile = goalDir + '/' + fileFriendlyDate + '.json';
        fs.writeFileSync(postFile, JSON.stringify(post, null, '\t'));
    }

    private async readGoalTitle(goalId: string) {
        let url = smartProgressUrl + '/goal/' + encodeURIComponent(goalId);
        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            throw new Error('Could not load goal title: ' + response.statusText + '\n' + text);
        }
        const html = await response.text();
        const title = html.matchAll(REGEXP_GOAL_TITLE).next().value[1];
        return title;
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
        }
        return totalPostCount;
    }

    async readComments(postId: string): Promise<GetCommentsResponse> {
        let url = smartProgressUrl + '/blog/getComments?post_id=' + postId;
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
            let url = smartProgressUrl + image.url;
            const response = await fetch(url, {
                headers: {
                    Host: smartProgressHost
                }
            });
            const blob = await response.blob();
            const contentType = response.headers.get('Content-Type') || '';
            image.dataUrl = await getDataUrlFromBlob(blob, contentType);
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
