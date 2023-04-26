import "reflect-metadata";
import express from "express";
import { AppDataSource, Message } from "./database";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { createHash } from "crypto";

const app = express();

app.use(cookieParser());

app.get("/style.css", (req, res) => {
    res.header("Content-Type", "text/css").send(`html, body {
    font: 1.8rem 'VT323', monospace;
    background: #fbefd1;
}

textarea {
    resize: none;
    background: #f5ebd2;
    color: black;
    font: 1.5rem 'Neucha', cursive;
    border: 8pt solid #f5ebd2;
    border-radius: 16pt;
}

form {
    position: fixed;
    padding: 12pt;
    background: #000000aa;
    border-radius: 24pt;
    pointer-events: none;
    flex-direction: column;
    display: none;
}

p {
    user-select: none;
}

p.text {
    font: 1.5rem 'Neucha', cursive;
}

body {
    display: flex;
    flex-direction: column;
}

html {
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
}

input {
    margin-top: 4pt;
    background: black;
    color: white;
    font: 1.5rem 'VT323', monospace;
    border: 0;
    border-radius: 2pt;
}

button {
    background: transparent;
    font: 1.8rem 'VT323', monospace;
    border: 0;
    color: blue;
    text-decoration: underline;
    cursor: pointer;
}

button:focus-within form {
    pointer-events: auto;
    display: flex;
}

@media screen and (max-width: 1076px) {
    form {
        left: 4pt;
    }
}
@media screen and (max-width: 543px) {
    textarea {
        font: 1.2rem 'Neucha', cursive;
        width: 250px;
        height: 80px;
    }
}`);
});

let timesSent = 0;
let firstTimeSent = 0;

app.post("/post_message", (_, res, next) => {
    if (Date.now() - firstTimeSent > 3600000 && timesSent >= 100) return res.redirect("/ratelimited.html");
    next();
}, bodyParser.urlencoded({ extended: true, limit: 500 }), async (req, res) => {
    if (!req.body) return res.status(400).send("In the beginning, there was nothing");
    const content = req.body.message.replace(/\n/g, " ").trim();
    if (typeof content != 'string' || content.length == 0 || content.length > 100) return res.status(400).send("It was a string all along? Always has been");
    const { hash } = req.query;
    if (typeof hash != 'string') return res.status(400).send("Are you happy living without past?");

    const message = typeof hash == 'string'
        ? await Message.repo().findOne({
            where: {
                hash,
            },
        })
        : null;

    if (!message && typeof hash == 'string') return res.status(400).send("If we could do anything, one could find things that they should never see");

    const newHash = createHash('sha256').update(hash + content).digest('base64');

    if (await Message.repo().findOne({ where: { hash: newHash } })) return res.status(418).send("We've accidentally sent your pizza to a wrong address. Have a complementary tea instead");

    if (message && !message.replied) {
        message.replied = Math.random() < 0.9; // he he he...
        await message.save();
    }

    const newMessage = new Message();
    newMessage.hash = newHash;
    newMessage.content = content;
    newMessage.parent = hash;
    newMessage.at = Date.now();
    newMessage.replied = false;

    await Message.repo().save(newMessage);

    if (Date.now() - firstTimeSent > 3600000) { // Your sins shall be forgiven
        firstTimeSent = Date.now();
        timesSent = 1;
    }
    else timesSent++;

    res.redirect(Math.random() < 0.99 ? "/success.html" : "/success-secret.html");
});

app.get("/ratelimited.html", (_, res) => {
    res.send(`<!DOCTYPE HTML>
<html>
<head>
<title>Submit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Neucha&family=VT323&display=swap" rel="stylesheet">
<link rel="preconnect" href="/style.css">
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width;initial-scale=1">
</head>
<body>
<p>Our servers cannot handle that level of load. Please come back in an hour</p>
</body>
</html>`);
});

app.get("/success-secret.html", (_, res) => {
    res.send(`<!DOCTYPE HTML>
<html>
<head>
<title>Submit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Neucha&family=VT323&display=swap" rel="stylesheet">
<link rel="preconnect" href="/style.css">
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width;initial-scale=1">
</head>
<body>
<p>I see you've uploaded your post. Congratulations on contributing to the Research</p>
</body>
</html>`);
});

app.get("/success.html", (_, res) => {
    res.send(`<!DOCTYPE HTML>
<html>
<head>
<title>Submit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Neucha&family=VT323&display=swap" rel="stylesheet">
<link rel="preconnect" href="/style.css">
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width;initial-scale=1">
</head>
<body>
<p>Your post has been uploaded. Please come back later</p>
</body>
</html>`);
});

app.get("/", async (_, res) => {
    const message = await Message.repo().find({ // Yes, branches are a feature now
        where: {
            replied: false,
        }
    }).then(msgs => msgs.length > 0 ? msgs[Math.floor(Math.random() * msgs.length)] : null);

    const textarea = `<form action="/post_message${message ? `?hash=${encodeURIComponent(message.hash)}` : ""}" method="POST" id="form">
<textarea name="message" form="form" maxlength="100" required>hoi</textarea>
<input type="submit" value="Post">
</form>`;

    const body = message
        ? `<p class="text">${message.content.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")}</p><p><button>Click${textarea}</button> to reply</p>`
        : `<p>No mail available. <button>Click${textarea}</button> to say hello</p>`;

    res.send(`<!DOCTYPE HTML>
<html>
<head>
<title>${message ? "You've got mail!" : "No mail"}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Neucha&family=VT323&display=swap" rel="stylesheet">
<link rel="preconnect" href="/style.css">
<link rel="stylesheet" href="/style.css">
<meta name="viewport" content="width=device-width;initial-scale=1">
</head>
<body>
${body}
</body>
</html>`);
});

app.get("/status.txt", async (_, res) => {
    res.header("Content-Type", "text/plain").send(`Wasn't so hard to find, was it?

Message count: ${await Message.repo().count()}
Branches: ${await Message.repo().count({ where: { replied: false } })}
Dogs count: 1
Full message list: not yet available`);
});

app.get("/admin.txt", async (_, res) => {
    res.header("Content-Type", "text/plain").send(`Super secret admin panel

Please enter a password`);
});

app.get("/secret.txt", async (_, res) => {
    res.header("Content-Type", "text/plain").send(`Let me tell you a secret

Read More`);
});

app.get("/readmore.txt", async (_, res) => {
    res.header("Content-Type", "text/plain").send(`The knowledge you're after will only open to ones who can see it in darkness`);
});

async function main() {
    await AppDataSource.initialize();
    app.listen(18001);
    console.log(`up on localhost:18001`);
}

main();
