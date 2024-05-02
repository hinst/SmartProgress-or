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
        for (const post of other.posts) {
            if (!this.posts.find(p => p.id === post.id)) {
                this.posts.push(post);
                newPostCount++;
            }
        }
        return newPostCount;
    }
}