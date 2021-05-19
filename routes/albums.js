const express = require('express');
const router = express.Router();
const db = require('../database/database');
const mm = require('music-metadata');
const fs = require('fs');

router.get('/', function (req, res, next) {
    res.render('index', {title: 'Albums'});
});


router.get('/all_albums', function (req, res, next) {
    const query_service = `SELECT *
                           FROM albums`;
    db.query(query_service, (err, result) => {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
});

router.get('/album_ads', function (req, res, next) {
    const query = `SELECT *
                   FROM albums
                   WHERE promote = 1`;
    db.query(query, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

router.get('/get_album/:id', function (req, res, next) {
    const id = req.params.id;
    const query = `SELECT *
                   FROM albums
                   WHERE id = ?`;
    db.query(query, [id], (err, result) => {
        if (err) throw err;
        res.json(result[0]);
    });
});

router.post('/', function (req, res) {
    const title = req.body.title;
    const year = req.body.year;
    const description = req.body.description;
    const artist = req.body.artist;

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
                const thumb = "/thumbnails/" + sampleFile.name + ".png";
                writeFileSync("public" + thumb, cover.data);
                const query = `INSERT INTO albums
                               SET title       = ?,
                                   description = ?,
                                   year        = ?,
                                   artist      = ?,
                                   cover       = ?`;
                db.query(query, [title, description, year, artist, thumb], (err) => {
                    if (err) res.status(500).send(err);
                    if (err) throw err;
                    res.send(JSON.stringify({success: true}));
                });
            } catch (error) {
                console.error(error.message);
            }
        })();
    });
});

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
