CREATE DATABASE "hinst-website";
CREATE USER hinst_website_downloader WITH ENCRYPTED PASSWORD $password;
GRANT ALL PRIVILEGES ON DATABASE "hinst-website" TO hinst_website_downloader;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hinst_website_downloader;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public to hinst_website_downloader;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public to hinst_website_downloader;