export const smartProgressHost = 'smartprogress.do';
export const smartProgressUrl = 'https://' + smartProgressHost;

export interface Post {
    /** Can be: 'post' */
    type: string;
    id: string;
    msg: string;
    date: string;
    comments: Comment[];
    images: {
        url: string;
        dataUrl: string;
    }[];
    count_comments: string;
    username: string;
}

export interface Posts {
    blog: Post[];
}
