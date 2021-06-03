const express = require('express');
const router = express.Router();
const db = require('../database/database');
const mm = require('music-metadata');
const fs = require('fs');
const ftp = require("basic-ftp");

router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/all_songs', function (req, res, next) {
    const query_service = `SELECT *
                           FROM songs`;
    db.query(query_service, (err, result) => {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
});

router.get('/get_song/:id', function (req, res, next) {
    const id = req.params.id;
    console.log(id);
    const query_service = `SELECT *
                           FROM songs
                           WHERE id = ?`;
    db.query(query_service, [id], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
});

router.get('/songs_by_sections', function (req, res, next) {
    const query_service = `SELECT song_name,
                                  song_title,
                                  song_artist,
                                  song_album,
                                  album_id,
                                  songs_sections.section_id,
                                  (SELECT title FROM section WHERE id = songs_sections.section_id) as section,
                                  song_thumbnail,
                                  song_id
                           FROM songs
                                    LEFT JOIN songs_sections ON songs.id = songs_sections.song_id`;

    db.query(query_service, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

router.post('/upload', function (req, res) {
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    sampleFile = req.files.shadow;
    uploadPath = "public/musics/" + sampleFile.name;

    sampleFile.mv(uploadPath, function (err) {

        if (err)
            return res.status(500).send(err);
        (async () => {
            try {
                const metadata = await mm.parseFile(`${uploadPath}`);
                const cover = mm.selectCover(metadata.common.picture);
                // const query_service = `INSERT INTO songs SET song_name = ${uploadPath}, song_title = ${sampleFile.name}, song_thumbnail = 'data:${cover.format};base64,${cover.data.toString('base64')}'`;
                const query_service = `INSERT INTO songs
                                       SET song_name      = ?,
                                           song_title     = ?,
                                           song_thumbnail = ?`;
                db.query(query_service, [uploadPath, sampleFile.name, `data:${cover.format};base64,${cover.data.toString('base64')}`], (err) => {
                    if (err) res.status(500).send(err);
                    if (err) throw err;
                });
                res.send(JSON.stringify({success: true}));
                //console.log(util.inspect(metadata, { showHidden: false, depth: null }));
            } catch (error) {
                console.error(error.message);
            }
        })();

        //res.send('File uploaded!');
    });
});

router.post('/', function (req, res) {
    const song_title = req.body.song_title;
    const song_artist = req.body.song_artist;
    const song_album = req.body.song_album;

    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    sampleFile = req.files.trapsong;
    uploadPath = "public/musics/" + sampleFile.name;
    sampleFile.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);

        uploadToServer(uploadPath, sampleFile.name).then(() => {
            (async () => {
                try {
                    const metadata = await mm.parseFile(`${uploadPath}`);
                    const cover = mm.selectCover(metadata.common.picture);
                    const thumb = sampleFile.name + ".png";
                    writeFileSync("public/thumbnails/" + thumb, cover.data);
                    uploadToServer("public/thumbnails/" + thumb, thumb).then(() => {
                        console.log('Thumbnail uploaded');
                    }).catch((err) => {
                        console.log(err);
                    });
                    const query = `INSERT INTO songs
                                   SET song_name      = ?,
                                       song_title     = ?,
                                       song_album     = ?,
                                       song_artist    = ?,
                                       song_thumbnail = ?`;
                    db.query(query, ["http://fasobizness.com/trapflix/" + sampleFile.name, song_title ?? metadata.common.title, song_album ?? metadata.common.album, song_artist ?? metadata.common.albumartist, "http://fasobizness.com/trapflix/" + thumb], (err) => {
                        if (err) res.status(500).send(err);
                        if (err) throw err;
                        res.send(JSON.stringify({success: true}));
                    });
                    //console.log(util.inspect(metadata, { showHidden: false, depth: null }));
                } catch (error) {
                    console.error(error.message);
                }
            })();
        })
            .catch((error) => {
                return res.status(500).send(error);
            });


        //res.send('File uploaded!');
    });
});

router.post('/test', function (req, res) {
    const song_title = req.body.song_title;
    const song_artist = req.body.song_artist;
    const song_album = req.body.song_album;

    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    sampleFile = req.files.trapsong;
    uploadPath = "public/musics/" + sampleFile.name;
    sampleFile.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);

            (async () => {
                try {
                    const metadata = await mm.parseFile(`${uploadPath}`);
                    const cover = mm.selectCover(metadata.common.picture);
                    const thumb = sampleFile.name + ".png";
                    writeFileSync("public/thumbnails/" + thumb, cover.data);
                    const query = `INSERT INTO songs
                                   SET song_name      = ?,
                                       song_title     = ?,
                                       song_album     = ?,
                                       song_artist    = ?,
                                       song_thumbnail = ?`;
                    db.query(query, ["http://localhost:3000/musics/" + sampleFile.name, song_title ?? metadata.common.title, song_album ?? metadata.common.album, song_artist ?? metadata.common.albumartist, "http://localhost:3000/thumbnails/" + thumb], (err) => {
                        if (err) res.status(500).send(err);
                        if (err) throw err;
                        res.send(JSON.stringify({success: true}));
                    });
                    //console.log(util.inspect(metadata, { showHidden: false, depth: null }));
                } catch (error) {
                    console.error(error.message);
                }
            })();

        //res.send('File uploaded!');
    });
});

const uploadToServer = async (source, filename) => {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "185.201.11.27",
            user: "u976170382",
            password: "Sourir@rt24",
            secure: false
        });
        await client.uploadFrom(`${source}`, `trapflix/${filename}`)
    } catch (err) {
        console.log(err)
    }
    client.close()
}

const writeFileSync = function (path, buffer, permission) {
    permission = permission || 438; // 0666
    let fileDescriptor;

    try {
        fileDescriptor = fs.openSync(path, 'w', permission);
    } catch (e) {
        fs.chmodSync(path, permission);
        fileDescriptor = fs.openSync(path, 'w', permission);
    }

    if (fileDescriptor) {
        fs.writeSync(fileDescriptor, buffer, 0, buffer.length, 0);
        fs.closeSync(fileDescriptor);
    }
};

module.exports = router;
