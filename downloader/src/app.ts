import 'source-map-support/register';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { DateTime } from 'luxon';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown';
import { Pool } from 'pg';
import { Config } from './config';
import { GoalRecord } from './goalRecord';
import { ImageRecord } from './imageRecord';
import * as Smart from './smartProgress';
import { smartProgressHost, smartProgressUrl } from './smartProgress';
import { requireString } from './string';

class App {
	private readonly pool: Pool;
	private readonly dataDirectory: string = 'data';

	constructor(private config: Config) {
		fs.mkdirSync(this.dataDirectory, { recursive: true });
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
			if (this.config.migrate) {
				await this.migrateMarkdown();
				return;
			}
			for (const goalId of goalIds) {
				await this.syncGoal(goalId);
			}
		} finally {
			await this.pool.end();
		}
	}

	private async migrateMarkdown() {
		const posts = await this.pool.query(
			'SELECT goalId as "goalId", dateTime as "dateTime" from goalPosts',
		);
		for (const row of posts.rows) {
			const textRows = await this.pool.query(
				'SELECT text as "text", textEnglish as "textEnglish", textGerman as "textGerman" ' +
					'FROM goalPosts WHERE goalId = $1 AND dateTime = $2',
				[row.goalId, row.dateTime],
			);
			const textRow = textRows.rows[0];
			if (textRow.text) {
				const text = new NodeHtmlMarkdown().translate(textRow.text);
				await this.pool.query(
					'UPDATE goalPosts SET text = $1 WHERE goalId = $2 AND dateTime = $3',
					[text, row.goalId, row.dateTime],
				);
			}
			if (textRow.textEnglish) {
				const textEnglish = new NodeHtmlMarkdown().translate(textRow.textEnglish);
				await this.pool.query(
					'UPDATE goalPosts SET textEnglish = $1 WHERE goalId = $2 AND dateTime = $3',
					[textEnglish, row.goalId, row.dateTime],
				);
			}
			if (textRow.textGerman) {
				const textGerman = new NodeHtmlMarkdown().translate(textRow.textGerman);
				await this.pool.query(
					'UPDATE goalPosts SET textGerman = $1  WHERE goalId = $2 AND dateTime = $3',
					[textGerman, row.goalId, row.dateTime],
				);
			}
		}

		const comments = await this.pool.query(
			'SELECT goalId as "goalId", parentDateTime as "parentDateTime", dateTime as "dateTime", smartProgressUserId as "smartProgressUserId", text as "text" ' +
				'FROM goalPostComments',
		);
		for (const row of comments.rows) {
			if (row.text) {
				const text = new NodeHtmlMarkdown().translate(row.text);
				await this.pool.query(
					'UPDATE goalPostComments SET text = $1 ' +
						'WHERE goalId = $2 AND parentDateTime = $3 AND dateTime = $4 AND smartProgressUserId = $5',
					[text, row.goalId, row.parentDateTime, row.dateTime, row.smartProgressUserId],
				);
			}
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
		const goalIdInt = parseInt(goalId, 10);
		if (Number.isNaN(goalIdInt)) throw new Error('Cannot parse integer from goalId=' + goalId);
		const dateEpoch = this.parseDateTime(post.date).toUTC().toSeconds();
		const result = await this.pool.query(
			'SELECT COUNT(*) FROM goalPosts WHERE goalId = $1 AND dateTime = $2',
			[goalIdInt, dateEpoch],
		);
		if (!result.rows.length) return false;
		const count = parseInt(result.rows[0].count, 10);
		return !Number.isNaN(count) && count >= 1;
	}

	private parseDateTime(text: string): DateTime {
		const dateTime = DateTime.fromFormat(text, 'yyyy-MM-dd HH:mm:ss', { zone: 'UTC' });
		if (!dateTime.isValid) throw new Error('Cannot parse date time: "' + text + '"');
		return dateTime;
	}

	private async saveComments(post: Smart.Post, comments: Smart.Comment[]) {
		const parentDateTime = this.parseDateTime(post.date).toUTC().toSeconds();
		const goalId = parseInt(post.obj_id, 10);
		if (Number.isNaN(goalId)) throw new Error('Cannot parse integer from goalId=' + post.obj_id);
		for (const comment of comments) {
			const dateTime = this.parseDateTime(comment.date).toUTC().toSeconds();
			const smartProgressUserId = parseInt(comment.user_id, 10);
			if (Number.isNaN(smartProgressUserId))
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
					comment.msg,
				],
			);
		}
	}

	private async savePost(goalId: string, post: Smart.Post) {
		const goalIdInt = parseInt(goalId, 10);
		if (Number.isNaN(goalIdInt)) throw new Error('Cannot parse integer from goalId=' + goalId);
		const dateEpoch = this.parseDateTime(post.date).toUTC().toSeconds();
		await this.pool.query(
			'INSERT INTO goalPosts (goalId, dateTime, type, text) VALUES ($1, $2, $3, $4)' +
				' ON CONFLICT(goalId, dateTime) DO UPDATE SET type = excluded.type, text = excluded.text',
			[goalIdInt, dateEpoch, post.type, post.msg],
		);
	}

	private async saveImages(post: Smart.Post, imageRecords: ImageRecord[]) {
		const goalId = parseInt(post.obj_id, 10);
		if (Number.isNaN(goalId)) throw new Error('Cannot parse integer from goalId=' + post.obj_id);
		const dateEpoch = this.parseDateTime(post.date).toUTC().toSeconds();
		for (let index = 0; index < imageRecords.length; index++) {
			const image = imageRecords[index];
			await this.pool.query(
				'INSERT INTO goalPostImages (goalId, parentDateTime, sequenceIndex, contentType, file)' +
					' VALUES ($1, $2, $3, $4, $5)' +
					' ON CONFLICT(goalId, parentDateTime, sequenceIndex)' +
					' DO UPDATE SET contentType = excluded.contentType, file = excluded.file',
				[goalId, dateEpoch, index, image.contentType, image.data],
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
		const goalImage = await this.readGoalImage(document);
		const goalIdNumber = parseInt(goalId, 10);
		if (Number.isNaN(goalIdNumber)) throw new Error('Cannot parse integer from goalId=' + goalId);
		return new GoalRecord(goalIdNumber, title, descriptionHtml || '', authorName || '', goalImage);
	}

	private async readGoalImage(document: Document): Promise<ImageRecord> {
		let imageUrl = '';
		for (let i = 0; i < document.head.children.length; ++i) {
			const metaItem = document.head.children.item(i);
			if (!metaItem) continue;
			if (metaItem.tagName.toLowerCase() === 'link' && metaItem.getAttribute('rel') === 'image_src')
				imageUrl = metaItem.getAttribute('href') || '';
		}
		if (imageUrl.length === 0) throw new Error('Cannot find image');
		const imageResponse = await fetch(imageUrl);
		if (!imageResponse.ok)
			throw new Error(
				'Cannot read image. Status: ' + imageResponse.statusText + ', URL: ' + imageUrl,
			);
		const contentType = imageResponse.headers.get('Content-Type') || '';
		const imageBlob = await imageResponse.blob();
		const imageData = await imageBlob.bytes();
		return new ImageRecord(contentType, imageData);
	}

	private async saveGoalInfo(goalRecord: GoalRecord) {
		await this.pool.query(
			'INSERT INTO goals (id, title, description, authorName, imageData, imageContentType) ' +
				'VALUES ($1, $2, $3, $4, $5, $6) ' +
				'ON CONFLICT(id) DO UPDATE SET ' +
				'title = excluded.title, ' +
				'description = excluded.description, ' +
				'authorName = excluded.authorName, ' +
				'imageData = excluded.imageData, ' +
				'imageContentType = excluded.imageContentType',
			[
				goalRecord.id,
				goalRecord.title,
				goalRecord.description,
				goalRecord.authorName,
				goalRecord.image.data,
				goalRecord.image.contentType,
			],
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
				Host: smartProgressHost,
			},
		});
		if (!response.ok) {
			const text = await response.text();
			throw new Error('Cannot read comments: ' + response.statusText + '\n' + text);
		}
		const responseObject: Smart.GetCommentsResponse = await response.json();
		return responseObject.comments || [];
	}

	private async readImages(post: Smart.Post): Promise<ImageRecord[]> {
		const imageRecords: ImageRecord[] = [];
		for (const image of post.images || []) {
			const url = smartProgressUrl + image.url;
			const response = await fetch(url, {
				headers: {
					Host: smartProgressHost,
				},
			});
			if (!response.ok)
				throw new Error(
					'Cannot read image. Status = ' + response.status + '\n' + (await response.text()),
				);

			const contentType = response.headers.get('Content-Type') || '';
			const blob = await response.blob();
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
			'&obj_type=0',
		].join('');
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				Host: smartProgressHost,
			},
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
		const config = new Config(
			requireString(process.env.goalId),
			requireString(process.env.postgresUrl),
			process.env.migrate === 'true',
		);
		await new App(config).run();
		process.exitCode = 0;
	} catch (e) {
		console.error('Error in main function', e);
		process.exitCode = 1;
	}
}

const _ = main();
