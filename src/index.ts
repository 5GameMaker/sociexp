import "reflect-metadata";
import express from "express";
import { AppDataSource, Message } from "./database";

const app = express();
const messages: Message[] = [];
const roots: Message[] = [];

const escape = (message: string) => message.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

app.get("/style.css", (_, res) => {
    res.header("Content-Type", "text/css").send(`html, body {
    font: 1.8rem 'VT323', monospace;
    background: #fbefd1;
}

a {
    text-decoration: none;
    color: black;
    display: block;
}

p {
    font: 1.5rem 'Neucha', cursive;
}

pre {
    font: 1.4rem 'VT323', monospace;
}

body {
    display: flex;
    flex-direction: column;
}`);
});

app.get("/", (_, res) => {
    res.send(`<!DOCTYPE HTML>
<html>
<head>
<title>All the mail!</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Neucha&family=VT323&display=swap" rel="stylesheet">
<link rel="preconnect" href="/style.css">
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width;initial-scale=1">
</head>
<body>
<h1>All the messages that were posted</h1>
${roots.map(m => `<a href="/${encodeURIComponent(m.hash)}"><h2>${escape(m.hash.slice(0,16))}</h2><p>${escape(m.content)}</p></a>`).join("")}
</body>
</html>`);
});

app.get("/:hash", (req, res) => {
    const hash = req.params.hash;
    const message = messages.find(m => m.hash == hash);
    if (!message) {
        return res.status(404).send("Its existence was a lie");
    }
    const previousMessages = [];
    let currentMessage = messages.find(m => m.hash == message.parent);
    while (currentMessage) {
        previousMessages.push(`<a href="/${encodeURIComponent(currentMessage.hash)}"><h3>${escape(currentMessage.hash.slice(0, 20))}</h3><p>${escape(currentMessage.content)}</p></a>`);
        if (!currentMessage.parent) break;
        currentMessage = messages.find(m => m.hash == currentMessage!.parent);
    }
    res.send(`<!DOCTYPE HTML>
<html>
<head>
<title>All the mail!</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Neucha&family=VT323&display=swap" rel="stylesheet">
<link rel="preconnect" href="/style.css">
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width;initial-scale=1">
</head>
<body>
<h1>${escape(message.hash)}</h1>
<p>${escape(message.content)}</p>
<h2>Previous messages</h2>
${previousMessages.join("")}
</body>
</html>`);
});

async function main() {
    await AppDataSource.initialize();
    messages.push(...await Message.repo().find());
    roots.push(...messages
        .filter(m => !m.replied)
        .filter(m => !messages.find(o => o.parent == m.hash)));
    app.listen(18001);
    console.log(`up on localhost:18001`);
}

main();
