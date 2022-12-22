CREATE DATABASE hyperzcloud CHARACTER SET utf8;
use hyperzcloud;

CREATE TABLE users (
    userid TEXT,
    email TEXT,
    password TEXT,
    premium BOOLEAN,
    webhook TEXT,
    secret TEXT
);

CREATE TABLE cats (
    uniqueid TEXT,
    userid TEXT,
    name TEXT,
    description TEXT,
    color TEXT
);

CREATE TABLE entries (
    uniqueid TEXT,
    userid TEXT,
    name TEXT,
    description TEXT,
    type TEXT,
    public BOOLEAN,
    accesstoken TEXT,
    content TEXT,
    status TEXT,
    color TEXT
);

CREATE TABLE staff (
    userid TEXT
);

ALTER DATABASE hyperzcloud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE cats CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE entries CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE staff CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

INSERT INTO staff (userid) VALUES ("704094587836301392");