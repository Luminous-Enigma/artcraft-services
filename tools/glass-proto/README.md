# Soul Mark: Glass prototype pictures

Stand-in work only: a signed-in test user with 2,500 credits; no real account, ever.

```bash
node pictures.mjs ../../frontend/apps/artcraft-webapp/public/glass
```

```bash
node standin.mjs standin
```

Then make `standin/clip-1.mp4`, `clip-2.mp4` and their `-thumb.jpg` with ffmpeg (see the commit
that added these tools), build the web app, and run:

```bash
node shots.mjs ../../frontend/apps/artcraft-webapp/dist out
```

`shots.mjs` takes five sets: the frost ladder, the Darkened ladder, every workspace, the six
pictures, and phone sizes. It writes `out/report.json` with the glass fill and the worst-case
contrast for every picture.
