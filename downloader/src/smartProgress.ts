export const smartProgressHost = 'smartprogress.do';
export const smartProgressUrl = 'https://' + smartProgressHost;

export interface Posts {
    blog: Post[];
}

export interface Post {
    /** Can be: 'post' */
    type: string;
    id: string;
    msg: string;
    /** Example: 2023-04-28 09:12:21 */
    date: string;
    comments: Comment[];
    images: {
        url: string;
        dataUrl: string;
        data: Uint8Array;
        contentType: string;
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
