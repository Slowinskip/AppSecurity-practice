const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if(title && author && email && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];
      console.log(fileName);
      if((fileExt[1] === '.jpg' || '.png' || '.gif') && title.length <= 25 ){
        const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);

        const standardPattern = new RegExp(/(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/, 'g');
        const emailPattern = new RegExp(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,'g'); 

        if(!standardPattern.test(author)){
          throw new Error('Invalid author');
        } 
        if(!standardPattern.test(title)){
          throw new Error('Invalid title');
        }
        if(!emailPattern.test(email)){
          throw new Error('Invalid title');
        }



      }else {
        throw new Error('Wrong input!');
      }
    }
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const userIp = requestIp.getClientIp(req);
    const findUser = await Voter.findOne({ user: userIp });
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });

    if (findUser) {
      const findVote = findUser.votes.includes(photoToUpdate._id);
      if (findVote) {
        res.status(500).json({ message: 'You cannot vote twice' });
      } else if (!findVote) {
        await Voter.findOneAndUpdate(
          { user: userIp },
          { $push: { votes: photoToUpdate._id } },
          () => {
            photoToUpdate.votes++;
            photoToUpdate.save();
            res.send({ message: 'OK' });
          }
        );
      }
    } else if (!findUser) {
      const newUser = new Voter({
        user: userIp,
        $push: { votes: photoToUpdate._id },
      });
      await newUser.save();
    }
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
  } catch (err) {
    res.status(500).json(err);
  }
};