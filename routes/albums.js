const express = require('express');
const router = express.Router();
const db = require('../database/database');
const mm = require('music-metadata');
const fs = require('fs');
const ftp = require("basic-ftp");
require('dotenv').config();

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
                   FROM songs
                   WHERE album_id = ?`;
    db.query(query, [id], (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

/*
First: User upload album details
Then: User upload songs
This route is only when you want to do this way
 */

router.post('/only_album_information', function (req, res) {
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

/*
Whole Album details (information) with songs
 */

router.post('/localinstance', function (req, res) {
    const artist = req.body.song_artist;
    const title = req.body.song_title;
    const album = req.body.song_album;
    const description = req.body.song_description;
    const year = req.body.song_release_date;
    let cover = null;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('Missing params.');
    }

    if (req.files.trapcover === undefined) {
        return res.status(400).send('Cover not found.');
    }

    let albumCover = req.files.trapcover;
    let uploadCoverPath = "public/thumbnails/" + albumCover.name;

    albumCover.mv(uploadCoverPath, function (err) {
        if (err) return res.status(500).send(err);
        /*TODO: upload to server
        uploadToServer("public/covers/", albumCover.name).then(() => {
            console.log('cover uploaded');
        }).catch((err) => {
            console.log(err);
        });*/
    });

    // save album
    const query = `INSERT INTO albums
                   SET title       = ?,
                       description = ?,
                       year        = ?,
                       artist      = ?,
                       cover       = ?`;
    db.query(query, [title, description, year, artist, process.env.URL + '/thumbnails/' + albumCover.name], (err, result) => {
        //if (err) res.status(500).send(err);
        if (err) throw err;

        req.files.trapsong.map((song) => {
            let sampleFile = song;
            let uploadPath = "public/musics/" + song.name;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                //res.send("success");

                //save mp3
                (async () => {
                    try {
                        const metadata = await mm.parseFile(`${uploadPath}`);
                        const cover = mm.selectCover(metadata.common.picture);
                        const thumb = song.name + ".png";
                        writeFileSync("public/thumbnails/" + thumb, cover.data);
                        const query = `INSERT INTO songs
                                       SET song_name      = ?,
                                           song_title     = ?,
                                           song_album     = ?,
                                           song_artist    = ?,
                                           song_thumbnail = ?,
                                           album_id       = ?`;
                        db.query(query, [
                            process.env.URL + "/musics/" + sampleFile.name,
                            metadata.common.title,
                            album ?? metadata.common.album,
                            artist ?? metadata.common.albumartist,
                            process.env.URL + "/thumbnails/" + thumb,
                            result.insertId
                        ], (err) => {
                            if (err) res.status(500).send(err);
                            if (err) throw err;
                            //res.send(JSON.stringify({success: true}));
                        });
                        //console.log(util.inspect(metadata, { showHidden: false, depth: null }));
                    } catch (error) {
                        console.error(error.message);
                    }
                })()
                //res.send(JSON.stringify({success: true}));
            });

        });
    });
    res.send(JSON.stringify({success: true}));

    /*sampleFile = req.files.cover;
    uploadPath = "public/images/" + sampleFile.name;
    sampleFile.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);

        res.end("success");
        /!*(async () => {
            try {
                const metadata = await mm.parseFile(`${uploadPath}`);
                const cover = mm.selectCover(metadata.common.picture);
                const thumb = "/thumbnails/" + sampleFile.name + ".png";
                //writeFileSync("public" + thumb, cover.data);
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
        })();*!/
    });*/
});

router.post('/instance', function (req, res) {
    const artist = req.body.song_artist;
    const title = req.body.song_title;
    const album = req.body.song_album;
    const description = req.body.song_description;
    const year = req.body.song_release_date;
    let cover = null;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('Missing params.');
    }

    if (req.files.trapcover === undefined) {
        return res.status(400).send('Cover not found.');
    }

    let albumCover = req.files.trapcover;
    let uploadCoverPath = "public/thumbnails/" + albumCover.name;

    albumCover.mv(uploadCoverPath, function (err) {
        if (err) return res.status(500).send(err);

        uploadToServer(uploadCoverPath, albumCover.name).then(() => {
            console.log('cover uploaded');
        }).catch((err) => {
            console.log(err);
        });
    });

    // save album
    const query = `INSERT INTO albums
                   SET title       = ?,
                       description = ?,
                       year        = ?,
                       artist      = ?,
                       cover       = ?`;
    db.query(query, [title, description, year, artist, `${process.env.URL}/${albumCover.name}`], (err, result) => {
        //if (err) res.status(500).send(err);
        if (err) throw err;

        req.files.trapsong.map((song) => {
            let sampleFile = song;
            let uploadPath = "public/musics/" + song.name;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                uploadToServer(uploadPath, sampleFile.name)
                    .then(() => {
                        //save mp3
                        (async () => {
                            try {
                                const metadata = await mm.parseFile(`${uploadPath}`);
                                const cover = mm.selectCover(metadata.common.picture);
                                const thumb = song.name + ".png";
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
                                                   song_thumbnail = ?,
                                                   album_id       = ?`;
                                db.query(query, [
                                    process.env.URL + "/" + sampleFile.name,
                                    metadata.common.title,
                                    album ?? metadata.common.album,
                                    artist ?? metadata.common.albumartist,
                                    process.env.URL + "/" + thumb,
                                    result.insertId
                                ], (err) => {
                                    if (err) res.status(500).send(err);
                                    if (err) throw err;
                                    //res.send(JSON.stringify({success: true}));
                                });
                                //console.log(util.inspect(metadata, { showHidden: false, depth: null }));
                            } catch (error) {
                                console.error(error.message);
                            }
                        })()
                    })
                    .catch((error) => {
                        return res.status(500).send(error);
                    });

            });

        });
    });
    res.send(JSON.stringify({success: true}));

    /*sampleFile = req.files.cover;
    uploadPath = "public/images/" + sampleFile.name;
    sampleFile.mv(uploadPath, function (err) {
        if (err)
            return res.status(500).send(err);

        res.end("success");
        /!*(async () => {
            try {
                const metadata = await mm.parseFile(`${uploadPath}`);
                const cover = mm.selectCover(metadata.common.picture);
                const thumb = "/thumbnails/" + sampleFile.name + ".png";
                //writeFileSync("public" + thumb, cover.data);
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
        })();*!/
    });*/
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


module.exports = router;
