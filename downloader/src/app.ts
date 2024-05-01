import 'source-map-support/register';
import { Config } from './config';
import { requireString } from './string';
import * as Smart from './smartProgress';
import { smartProgressHost, smartProgressUrl } from './smartProgress';
import fs from 'fs';

class App {
    constructor(private config: Config) {
    }

    async run() {
        const posts = await this.readGoalPosts(this.config.goalId);
        fs.mkdirSync('data', { recursive: true });
        const filePath = 'data/' + this.config.goalId + '.json';
        fs.writeFileSync(filePath, JSON.stringify(posts, null, '\t'));
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
        return allPosts;
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
