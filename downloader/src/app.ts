import 'source-map-support/register';
import { Config } from './config';
import { requireString } from './string';
import * as Smart from './smartProgress';
import { smartProgressHost, smartProgressUrl } from './smartProgress';
import fs from 'fs';
import { GoalInfo } from './goalInfo';
import { GoalHeader } from './goalHeader';

const REGEXP_GOAL_TITLE = /<title>(.*?)<\/title>/g;

interface GetCommentsResponse {
    /** Should be "success" */
    status: string;
    comments: Comment[];
}

async function getDataUrlFromBlob(data: Blob, contentType: string): Promise<string> {
    return 'data:' + contentType + ';base64,' + Buffer.from(await data.arrayBuffer()).toString('base64');
}

class App {
    constructor(private config: Config) {
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
        const goalTitle = await this.readGoalTitle(goalId);
        const posts = await this.readGoalPosts(goalId);
        const goalInfo = new GoalInfo(goalId, goalTitle, posts);
        fs.mkdirSync('data', { recursive: true });
        this.saveGoal(goalId, goalInfo);
    }

    private saveGoal(goalId: string, goalInfo: GoalInfo) {
        const filePath = 'data/' + goalId + '.json';
        if (fs.existsSync(filePath)) {
            const existingGoalInfo = JSON.parse(fs.readFileSync(filePath).toString());
            const newPostCount = goalInfo.merge(existingGoalInfo);
            console.log('Merged ' + goalId + '. New post count: ' + newPostCount);
        }
        fs.writeFileSync(filePath, JSON.stringify(goalInfo, null, '\t'));
        const goalAuthor = goalInfo.posts[0]?.username || '';
        const goalHeader = new GoalHeader(goalId, goalInfo.title, goalInfo.posts.length, new Date().toISOString(), goalAuthor);
        fs.mkdirSync('data/headers', { recursive: true });
        const headerFilePath = 'data/headers/' + goalId + '.json';
        fs.writeFileSync(headerFilePath, JSON.stringify(goalHeader, null, '\t'));
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

    private async readGoalPosts(goalId: string) {
        const allPosts: Smart.Post[] = [];
        let startId = '0';
        while (true) {
            const posts = await this.readPosts(goalId, startId);
            if (posts?.blog?.length) {
                allPosts.push(...posts.blog);
                startId = posts.blog[posts.blog.length - 1].id;
            } else
                break;
        }
        for (const post of allPosts) {
            if (post.comments && post.comments.length < parseInt(post.count_comments)) {
                post.comments = (await this.readComments(post.id)).comments;
            }
            if (post.images && post.images.length)
                await this.readImages(post);
        }
        return allPosts;
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
