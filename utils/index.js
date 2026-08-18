const Bcrypt = require('bcrypt');
var cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');

const fs = require('fs');
let secret = process.env.JWT_SECRET;
// const fs = require('fs');
const formidable = require('formidable');
// const formidable = require('formidable')
// Enter copied or downloaded access ID and secret key here

// The name of the bucket that you have created

// Enter copied or downloaded access ID and secret key here

let methods = {
  configCloudinary: () => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECERET,
    });
    return cloudinary;
  },

  hashPassword: (password) => {
    return new Promise((resolve, reject) => {
      Bcrypt.hash(password, 10, (err, passwordHash) => {
        if (err) {
          reject(err);
        } else {
          resolve(passwordHash);
        }
      });
    });
  },

  comparePassword: (pw, hash) => {
    return new Promise((resolve, reject) => {
      Bcrypt.compare(pw, hash, function (err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  },

  // issueToken: (payload) => {
  //   return new Promise((resolve, reject) => {
  //     jwt.sign(payload, secret, { expiresIn: "6h" }, (err, accessToken) => {
  //       if (err) {
  //         reject(err);
  //       } else {
  //         jwt.sign(
  //           payload,
  //           secret,
  //           { expiresIn: "7d" },
  //           (err, refreshToken) => {
  //             if (err) {
  //               reject(err);
  //             } else {
  //               resolve({ accessToken, refreshToken });
  //             }
  //           }
  //         );
  //       }
  //     });
  //   });
  // },

  // refreshTokens: (refreshToken) => {
  //   return new Promise((resolve, reject) => {
  //     jwt.verify(refreshToken, secret, {}, (err, decoded) => {
  //       if (err) {
  //         reject(err);
  //       } else {
  //         const payload = { userId: decoded.userId }; // Modify the payload as per your needs
  //         generateTokens(payload)
  //           .then(({ accessToken, refreshToken }) => {
  //             resolve({ accessToken, refreshToken });
  //           })
  //           .catch((err) => {
  //             reject(err);
  //           });
  //       }
  //     });
  //   });
  // },
  issueToken: (payload) => {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, secret, { expiresIn: '7d' }, (err, accessToken) => {
        // Change expiresIn to "7d"
        if (err) {
          reject(err);
        } else {
          jwt.sign(payload, secret, { expiresIn: '7d' }, (err, refreshToken) => {
            if (err) {
              reject(err);
            } else {
              resolve({ accessToken, refreshToken });
            }
          });
        }
      });
    });
  },

  adminToken: (payload) => {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, secret, { expiresIn: '12h' }, (err, accessToken) => {
        if (err) {
          reject(err);
        } else {
          jwt.sign(payload, secret, { expiresIn: '12h' }, (err, refreshToken) => {
            if (err) {
              reject(err);
            } else {
              resolve({ accessToken, refreshToken });
            }
          });
        }
      });
    });
  },

  refreshTokens: (refreshToken) => {
    return new Promise((resolve, reject) => {
      jwt.verify(refreshToken, secret, {}, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          const payload = { userId: decoded.userId }; // Modify the payload as per your needs
          generateTokens(payload)
            .then(({ accessToken, refreshToken }) => {
              resolve({ accessToken, refreshToken });
            })
            .catch((err) => {
              reject(err);
            });
        }
      });
    });
  },

  verifyToken: async (token, cb) => jwt.verify(token, secret, {}, cb),

  attachBodyAndFiles: (req, res, next) => {
    console.log('Attach File Function Called');

    let form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {
      if (err) {
        return res.status(500).json({
          success: false,

          msg: 'General Middleware File Handling Error',

          err,
        });
      }

      req.files = [];

      for (const key in files) {
        //eslint-disable-next-line
        if (files.hasOwnProperty(key)) {
          const element = files[key];

          req.files.push(element);
        }
      }

      req.body = fields;

      next();
    });
  },
  uploadFileto3: (file) => {
    var ext = file.mimetype.split('/').pop();

    return new Promise(function (resolve, reject) {
      var stream;

      if (file.path) {
        stream = fs.createReadStream(file.path);
      }

      if (file.filepath) {
        stream = fs.createReadStream(file.filepath);
      } else {
        stream = file.data;
      }

      // if (!name) {

      let name = Date.now().toString() + '.' + ext;

      // }

      var data = {
        Key: name,

        ACL: 'public-read',

        Body: stream,

        ContentType: file.mimetype,

        Bucket: BUCKET_NAME,
      };

      s3.upload(data, function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  },

  uploadFileToCloudinaryToBedeleted: (file) => {
    let fileExtension = file.mimetype.split('/').pop();

    fileExtension = fileExtension.toUpperCase();

    let fileType = methods.findFileType(fileExtension);

    if (fileType === 'Image') {
      //   console.log("fileis -->", file);
      console.log('file type is image ');
      var CloudinaryObj = methods.configCloudinary();
      CloudinaryObj.uploader
        .upload(file.filepath)
        .then((result) => console.log(`result is `, result))
        .catch((err) => {
          for (var i in err) {
            console.log('error is ', err[i]);
          }
          // console.log(`error is ${err}`);
        });
    }
    if (fileType === 'Video') {
      //   console.log("fileis -->", file);
      console.log('file type is video ');
      CloudinaryObj = methods.configCloudinary();
      CloudinaryObj.uploader
        .upload(file.filepath, { resource_type: 'video' })
        .then((result) => console.log(`result is `, result))
        .catch((err) => {
          for (var i in err) {
            console.log('error is ', err[i]);
          }
          // console.log(`error is ${err}`);
        });
    }

    if (fileType === 'Other') {
    }
  },

  // uploadFileToCloudinary: async (file) => {
  //   return new Promise((resolve, reject) => {
  //     if (!file || !file.mimetype || !file.filepath) {
  //       return reject(new Error("Invalid file object"));
  //     }

  //     let fileExtension = file.mimetype.split("/").pop();
  //     fileExtension = fileExtension.toUpperCase();

  //     let fileType = methods.findFileType(fileExtension);

  //     var CloudinaryObj = methods.configCloudinary();

  //     if (fileType === "Image") {
  //       CloudinaryObj.uploader
  //         .upload(file.filepath)
  //         .then((result) => {
  //           resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           reject(err);
  //         });
  //     } else if (fileType === "Video") {
  //       CloudinaryObj.uploader
  //         .upload(file.filepath, { resource_type: "video" })
  //         .then((result) => {
  //           resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           reject(err);
  //         });
  //     } else if (fileType === "PDF") {
  //       CloudinaryObj.uploader
  //         .upload(file.filepath, { resource_type: "raw" })
  //         .then((result) => {
  //           resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           reject(err);
  //         });
  //     } else {
  //       // Handle other cases as needed
  //       reject(new Error("Unsupported file type"));
  //     }
  //   });
  // },

  // uploadFileToCloudinary: async (file) => {
  //   return new Promise((resolve, reject) => {
  //     if (!file || !file.mimetype) {
  //       return reject(new Error("Invalid file object"));
  //     }

  //     let fileExtension = file.mimetype.split("/").pop();
  //     fileExtension = fileExtension.toUpperCase();
  //     let fileType = methods.findFileType(fileExtension);

  //     if (fileType === "Image") {
  //       //   console.log("fileis -->", file);
  //       console.log("file type is image ");
  //       var CloudinaryObj = methods.configCloudinary();
  //       CloudinaryObj.uploader
  //         .upload(file.filepath)
  //         .then((result) => {
  //           return resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           return reject(err);
  //           // console.log(`error is ${err}`);
  //         });
  //     }
  //     if (fileType === "Video") {
  //       //   console.log("fileis -->", file);
  //       console.log("file type is video ");
  //       CloudinaryObj = methods.configCloudinary();
  //       CloudinaryObj.uploader
  //         .upload(file.filepath, { resource_type: "video" })
  //         .then((result) => {
  //           return resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           return reject(err);
  //           // console.log(`error is ${err}`);
  //         });
  //     }
  //     if (fileType === "PDF") {
  //       console.log("file type is PDF ");
  //       CloudinaryObj = methods.configCloudinary();
  //       CloudinaryObj.uploader
  //         .upload(file.filepath, { resource_type: "raw" })
  //         .then((result) => {
  //           return resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           return reject(err);
  //         });
  //     }
  //     if (fileType === "DOCX") {
  //       console.log("file type is DOCX ");
  //       CloudinaryObj = methods.configCloudinary();
  //       CloudinaryObj.uploader
  //         .upload(file.filepath, { resource_type: "raw" })
  //         .then((result) => {
  //           return resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           return reject(err);
  //         });
  //     }

  //     if (fileType === "Other") {
  //       console.log("file path is ", file);
  //       filePath = file.filepath + ".txt";
  //       console.log("file type is video ");
  //       CloudinaryObj = methods.configCloudinary();
  //       CloudinaryObj.uploader
  //         .upload(file.originalFilename, { resource_type: "raw" })
  //         .then((result) => {
  //           return resolve(result.secure_url);
  //         })
  //         .catch((err) => {
  //           return reject(err);
  //           // console.log(`error is ${err}`);
  //         });
  //     }
  //   });
  // },

  // uploadFileToFtp: () => {},

  uploadFileToCloudinary: async (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new Error('Invalid file object'));
      }

      var CloudinaryObj = methods.configCloudinary();

      // Determine the resource type based on file extension or set it to "auto" if extension is missing
      let resourceType = 'auto';
      if (file.filepath) {
        const fileExtension = file.filepath.split('.').pop().toLowerCase();
        if (fileExtension === 'docx') {
          // For DOCX files, set the resource type to "raw" (you can adjust this based on your needs)
          resourceType = 'raw';
        }
      }

      CloudinaryObj.uploader
        .upload(file.filepath, { resource_type: resourceType })
        .then((result) => {
          console.log('*********************', result)
          return resolve(result);
        })
        .catch((err) => {
          return reject(err);
        });
    });
  },

  deleteFileFromCloudinary: async (file, type, resource_type) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new Error('Invalid file object'));
      }

      var CloudinaryObj = methods.configCloudinary();
      
      if ( type === 'public_id'){
        CloudinaryObj.uploader.
          destroy(file, { resource_type: resource_type })
          .then((result) => {
            console.log('*********************', result)
            return resolve(result);
          })
          .catch((err) => {
            return reject(err);
          });
      }

      else if ( type === 'secure_url') {
        let identifier = '';

        //const match = file?.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
        const match = file?.match(/\/upload\/(?:v\d+\/)?([^\/\.]+)/);
        if (match) {
            identifier = match[1];
        } else {
            return reject(new Error('public_id not found and secure_url is invalid'));
        }

        CloudinaryObj.uploader.
        destroy(identifier, { resource_type: resource_type })
        .then((result) => {
          console.log('*********************', result)
          return resolve(result);
        })
        .catch((err) => {
          return reject(err);
        });
      }
    });
  },

  findFileType: (fileExtension) => {
    console.log(`file extension is ${fileExtension}`);
    let imagesFileExtensions = new Set([
      'JPEG',
      'PNG',
      'GIF',
      'TIFF',
      'PSD',
      'PDF',
      'EPS',
      'AI',
      'INDD',
      'RAW',
      'CSV',
      'XLSX',
      'DOC',
      'DOCX',
    ]);

    let videoFileExtensions = new Set([
      'MP4',
      'MOV',
      'WMV',
      'AVI',
      'AVCHD',
      'FLV',
      'F4V',
      'SWF',
      'MKV',
      'WEBM',
      'HTML5',
      'MPEG-2',
    ]);

    var fileType = 'Other';

    if (imagesFileExtensions.has(fileExtension) === true) {
      console.log(`extension is ${fileExtension}`);
      fileType = 'Image';
    }
    if (videoFileExtensions.has(fileExtension) === true) {
      fileType = 'Video';
    }

    return fileType;
  },

  //Cloudinary multiple files uplaod

  attachBodyAndMultipleFiles: (req, res, next) => {
    console.log('Attach File Function Called');
    let form = new formidable.IncomingForm();

    // console.log(form);

    console.log();
    form.parse(req, function (err, fields, files) {
      console.log('Formidable Parsing Completed');
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          msg: 'General Middleware File Handling Error',
          err,
        });
      }

      //console.log('Fields:', fields);
        //console.log('Files:', files);

      req.files = [];
      for (const key in files) {
        if (files.hasOwnProperty(key)) {
          const element = files[key];
          req.files.push(element);
        }
      }
      req.body = fields;
      next();
    });
  },
};

module.exports = methods;
