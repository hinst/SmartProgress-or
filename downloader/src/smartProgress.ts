export const smartProgressHost = 'smartprogress.do';
export const smartProgressUrl = 'https://' + smartProgressHost;

export interface Posts {
    blog: Post[];
}

export interface Post {
    /** Parent goal id */
    obj_id: string;
    id: string;
    /** Can be: 'post' */
    type: string;
    msg: string;
    /** Example: 2023-04-28 09:12:21 */
    date: string;
    comments: Comment[];
    images: {
        url: string;
    }[];
    count_comments: string;
    username: string;
}

export interface User {
    id: string;
    username: string;
}

export interface Comment {
    /** HTML */ msg: string;
    user: User;
    /** Integer */ user_id: string;
    /** Name */ username: string;
    /** Example: 2023-04-28 09:12:21 */ date: string;
}
