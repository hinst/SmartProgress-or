import 'source-map-support/register';
import { Config } from './config';
import { requireString } from './string';
import * as Smart from './smartProgress';
import { smartProgressHost, smartProgressUrl } from './smartProgress';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { DateTime } from 'luxon';
import { JSDOM } from 'jsdom';
import { GoalRecord } from './goalRecord';
import { ImageRecord } from './image';

class App {
	private readonly pool: Pool;
	private readonly db: DatabaseSync;
	private readonly dataDirectory: string = 'data';

	constructor(private config: Config) {
		fs.mkdirSync(this.dataDirectory, { recursive: true });
		this.db = new DatabaseSync(this.dataDirectory + '/hinst-website.db');
		this.db.exec('PRAGMA journal_mode=WAL;');
		this.db.exec(`PRAGMA busy_timeout=${1000 * 60 * 5};`);
		this.db.exec(fs.readFileSync('schema.sql').toString());
		this.pool = new Pool({
			connectionString: config.postgresUrl,
			max: 1,
		});
	}

	async run() {
		try {
			console.log(this.config);
			await this.pool.query(fs.readFileSync('schema.postgre.sql').toString());
			const goalIds = this.config.goalId.split(',');
			for (const goalId of goalIds) {
				await this.syncGoal(goalId);
			}
		} finally {
			await this.pool.end();
		}
	}

	private async syncGoal(goalId: string) {
		const goalInfo = await this.readGoalInfo(goalId);
		await this.saveGoalInfo(goalInfo);
		await this.syncPosts(goalId);
	}

	private async syncPosts(goalId: string) {
		const posts = await this.readAllPosts(goalId);
		let newCount = 0;
		for (const post of posts) {
			const isNew = !(await this.checkPostExists(goalId, post));
			await this.savePost(goalId, post);
			const age = -this.parseDateTime(post.date).diffNow().as('days');
			if (isNew || age < 100) {
				const comments = await this.readComments(post.id);
				await this.saveComments(post, comments);
			}
			if (isNew) {
				const images = await this.readImages(post);
				await this.saveImages(post, images);
				++newCount;
			}
		}
		console.log(`Sync complete: goal=${goalId} posts=${posts.length} new=${newCount}`);
	}

	private async checkPostExists(goalId: string, post: Smart.Post): Promise<boolean> {
		const goalIdInt = parseInt(goalId);
		if (isNaN(goalIdInt)) throw new Error('Cannot parse integer from goalId=' + goalId);
		const dateEpoch = this.parseDateTime(post.date).toUTC().toSeconds();
		const result = await this.pool.query(
			'SELECT COUNT(*) FROM goalPosts WHERE goalId = $1 AND dateTime = $2',
			[goalIdInt, dateEpoch]
		);
		if (!result.rows.length) return false;
		const count = parseInt(result.rows[0].count);
		return !isNaN(count) && count >= 1;
	}

	private parseDateTime(text: string): DateTime {
		const dateTime = DateTime.fromFormat(text, 'yyyy-MM-dd HH:mm:ss', { zone: 'UTC' });
		if (!dateTime.isValid) throw new Error('Cannot parse date time: "' + text + '"');
		return dateTime;
	}

	private async saveComments(post: Smart.Post, comments: Smart.Comment[]) {
		const parentDateTime = this.parseDateTime(post.date).toUTC().toSeconds();
		const goalId = parseInt(post.obj_id);
		if (isNaN(goalId)) throw new Error('Cannot parse integer from goalId=' + post.obj_id);
		for (const comment of comments) {
			const dateTime = this.parseDateTime(comment.date).toUTC().toSeconds();
			const smartProgressUserId = parseInt(comment.user_id);
			if (isNaN(smartProgressUserId))
				throw new Error('Cannot parse integer from userId' + comment.user_id);
			await this.pool.query(
				'INSERT INTO goalPostComments (goalId, parentDateTime, dateTime, smartProgressUserId, username, text)' +
					' VALUES ($1, $2, $3, $4, $5, $6)' +
					' ON CONFLICT (goalId, parentDateTime, dateTime, smartProgressUserId)' +
					' DO UPDATE SET username = excluded.username, text = excluded.text',
				[
					goalId,
					parentDateTime,
					dateTime,
					smartProgressUserId,
					comment.username || '',
					comment.msg
				]
			);
		}
	}

	private async savePost(goalId: string, post: Smart.Post) {
		const goalIdInt = parseInt(goalId);
		if (isNaN(goalIdInt)) throw new Error('Cannot parse integer from goalId=' + goalId);
		const dateEpoch = this.parseDateTime(post.date).toUTC().toSeconds();
		await this.pool.query(
			'INSERT INTO goalPosts (goalId, dateTime, type, text) VALUES ($1, $2, $3, $4)' +
				' ON CONFLICT(goalId, dateTime) DO UPDATE SET type = excluded.type, text = excluded.text',
			[goalIdInt, dateEpoch, post.type, post.msg]
		);
	}

	private async saveImages(post: Smart.Post, imageRecords: ImageRecord[]) {
		const goalId = parseInt(post.obj_id);
		if (isNaN(goalId)) throw new Error('Cannot parse integer from goalId=' + post.obj_id);
		const dateEpoch = this.parseDateTime(post.date).toUTC().toSeconds();
		for (let index = 0; index < imageRecords.length; index++) {
			const image = imageRecords[index];
			await this.pool.query(
				'INSERT INTO goalPostImages (goalId, parentDateTime, sequenceIndex, contentType, file)' +
					' VALUES ($1, $2, $3, $4, $5)' +
					' ON CONFLICT(goalId, parentDateTime, sequenceIndex)' +
					' DO UPDATE SET contentType = excluded.contentType, file = excluded.file',
				[goalId, dateEpoch, index, image.contentType, image.data]
			);
		}
	}

	private async readGoalInfo(goalId: string): Promise<GoalRecord> {
		const url = smartProgressUrl + '/goal/' + encodeURIComponent(goalId);
		const response = await fetch(url);
		if (!response.ok) {
			const text = await response.text();
			throw new Error('Could not load goal title: ' + response.statusText + '\n' + text);
		}
		const text = await response.text();
		const document = new JSDOM(text).window.document;
		const title = document.title;
		const descriptionHtml = document.querySelector('#goal_descr div')?.innerHTML.trim();
		const authorName = document.querySelector('.user-widget__name a')?.textContent?.trim();
		const goalIdNumber = parseInt(goalId);
		if (isNaN(goalIdNumber)) throw new Error('Cannot parse integer from goalId=' + goalId);
		return new GoalRecord(goalIdNumber, title, descriptionHtml || '', authorName || '');
	}

	private async saveGoalInfo(goalRecord: GoalRecord) {
		await this.pool.query(
			'INSERT INTO goals (id, title, description, authorName) VALUES ($1, $2, $3, $4)' +
				' ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, authorName = excluded.authorName',
			[goalRecord.id, goalRecord.title, goalRecord.description, goalRecord.authorName]
		);
	}

	private async readAllPosts(goalId: string): Promise<Smart.Post[]> {
		let startId = '0';
		const allPosts: Smart.Post[] = [];
		while (true) {
			const posts = await this.readPosts(goalId, startId);
			if (!posts.blog.length) break;
			allPosts.push(...posts.blog);
			startId = posts.blog[posts.blog.length - 1].id;
		}
		return allPosts;
	}

	private async readComments(postId: string): Promise<Smart.Comment[]> {
		const url = smartProgressUrl + '/blog/getComments?post_id=' + postId;
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				Host: smartProgressHost
			}
		});
		if (!response.ok) {
			const text = await response.text();
			throw new Error('Cannot read comments: ' + response.statusText + '\n' + text);
		}
		const responseObject: Smart.GetCommentsResponse = (await response.json());
		return responseObject.comments || [];
	}

	private async readImages(post: Smart.Post): Promise<ImageRecord[]> {
		const imageRecords: ImageRecord[] = [];
		for (const image of post.images || []) {
			const url = smartProgressUrl + image.url;
			const response = await fetch(url, {
				headers: {
					Host: smartProgressHost
				}
			});
			if (!response.ok)
				throw new Error(
					'Cannot read image. Status = ' +
						response.status +
						'\n' +
						(await response.text())
				);

			const contentType = response.headers.get('Content-Type') || '';
			const blob = await response.blob();
			//@ts-ignore
			const data = await blob.bytes();
			const imageRecord = new ImageRecord(contentType, data);
			imageRecords.push(imageRecord);
		}
		return imageRecords;
	}

	private async readPosts(goalId: string, startId: string): Promise<Smart.Posts> {
		const url = [
			smartProgressUrl,
			'/blog/getPosts',
			'?obj_id=',
			goalId,
			'&sorting=old_top',
			'&start_id=',
			startId,
			'&end_id=0',
			'&step_id=0',
			'&only_author=0',
			'&change_sorting=0',
			'&obj_type=0'
		].join('');
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

async function main() {
	console.log('Starting SmartProgress downloader with Node.js version ' + process.versions.node);
	try {
		const config = new Config(requireString(process.env.goalId), requireString(process.env.postgresUrl));
		await new App(config).run();
	} catch (e) {
		console.error('Error in main function', e);
	}
}

main();
