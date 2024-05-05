import * as Smart from './smartProgress';

export class GoalInfo {
    constructor(
        public id: string,
        public title: string,
        public posts: Smart.Post[]
    ) {
    }

    merge(other: GoalInfo) {
        if (this.id !== other.id) {
            throw new Error('Cannot merge different goals');
        }
        if (other.title.length)
            this.title = other.title;
        let newPostCount = 0;
        for (const otherPost of other.posts) {
            if (!this.posts.find(thisPost => thisPost.id === otherPost.id)) {
                this.posts.push(otherPost);
                newPostCount++;
            }
        }
        return newPostCount;
    }
}

export class GoalHeader {
    constructor(
        public id: string,
        public title: string,
        public postCount: number,
        public updatedAt: string,
        public author: string,
    ) {
    }
}