const arraysIdentical = function (a, b) {
    let i = a.length;
    if (i != b.length) return false;
    while (i--) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const nonBlockingLoop = function(condition, loopInstruction) {
    return new Promise(function(resolve) {
        (function inner() {
            if(condition()) {
                loopInstruction();
                setTimeout(inner, 0);
            } else {
                resolve();
            }
        })();
    });
}

exports.axios_get = function(file, updateCallback, moreOptions) {
    const axios = require('axios');
    const displayName = (moreOptions && moreOptions.displayName) ? moreOptions.displayName : file;
    updateCallback("Downloading file " + displayName + "...");
    return axios.get('data/' + file, Object.assign({
        responseType: 'arraybuffer',
        onDownloadProgress: function(progressEvent) {
            updateCallback("Downloading file " + displayName + " " + ((progressEvent.loaded/progressEvent.total)*100.0).toFixed(2) + "%" + "...");
        }
    }, moreOptions)); 
};

exports.aesCTRDecryptor = function(keySize, ivSize, iterations, digest) {
    const aesjs = require('aes-js');
    const pbkdf2 = require('pbkdf2');
    const textEncoder = new TextEncoder("ascii");
    let tmpKeys = [];

    return function (data, password, updateCallback) {
        return new Promise(function(resolve, reject) {
            data = new Buffer(data);
            const header = data.slice(0, 8);
            const expectedHeader = textEncoder.encode("Salted__");
            if(arraysIdentical(header, expectedHeader)) {
                const salt = new Buffer(data.slice(8, 8+8));

                const key = password.toString()+salt.toString();
                let tmpKey = tmpKeys[key];

                nonBlockingLoop(
                    () => !tmpKey, 
                    () => {
                        updateCallback("Deriving key...");
                        pbkdf2.pbkdf2(password, salt, iterations, keySize+ivSize, digest, (err, derivedKey) => {
                            if(err) reject(err);
                            tmpKey = derivedKey;
                            tmpKeys[key] = tmpKey;
                        });
                    }
                ).then(() => {
                    const derivedKey = tmpKey.slice(0, keySize);
                    const iv = tmpKey.slice(keySize);
            
                    const aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey, new aesjs.Counter(iv));
                    const encryptedBytes = data.slice(8+8);
            
                    let decodedBytes = new Uint8Array(encryptedBytes.length);
                    let offset = 0;
            
                    nonBlockingLoop(
                        () => offset < encryptedBytes.length,
                        () => {
                            const dataBlock = encryptedBytes.slice(offset,Math.min(encryptedBytes.length, offset+500000));
                            const decodedBlock = aesCtr.decrypt(dataBlock);
                            decodedBytes.set(decodedBlock, offset);
                            offset += dataBlock.length;
                            updateCallback("Decrypting file: " + ((offset/encryptedBytes.length)*100.0).toFixed(2) + "%");
                        }
                    ).then(() => {
                        resolve(new Buffer(decodedBytes));
                    });
                });
            } else {
                reject("Unexpected header found.");
            }
        });
    }
};
