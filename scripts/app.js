"use strict";
(function() {
    const utils = require('./utils');

    const decryptData = utils.aesCTRDecryptor(256 / 8, 16, 10000, "sha256");

    window.onload = function() {
        const getElementById = id => document.getElementById(id);
        const unlockBtn = getElementById('unlockBtn');
        const statusDiv = getElementById('statusDiv');
        let audio;
        const password = getElementById('password');
        const fileListDiv = getElementById('fileList');
        const passwordDiv = getElementById('passwordDiv');
        const okDiv = getElementById('okDiv');
        const bottomDiv = getElementById('bottomDiv');

        const updateStatusDiv = function(newText) {
            statusDiv.innerText = newText;
        };

        const loadFile = function(elem) { 
            return function() {
                utils.axios_get(elem.currentFile.dataFile,updateStatusDiv, {'displayName': elem.currentFile.filename, headers: {'Range': "bytes="+elem.currentFile.offset+"-"+(parseInt(elem.currentFile.offset)+parseInt(elem.currentFile.length))}}).then(function(response) {
                    decryptData(response.data, elem.currentFile.password, updateStatusDiv).then(
                        function(decodedBytes) {
                            updateStatusDiv("Loading track...");
                            audio.src = "data:"+elem.currentFile.type+";base64," + decodedBytes.toString('base64');
                            audio.play();
                            updateStatusDiv("");
                        }
                    ).catch(function(error) {
                        updateStatusDiv("Failed to load file, invalid password maybe? " + error);
                    });
                });
            } 
        };

        function loadList(data) {
            try {
                const fileListData = JSON.parse(data).sort((a,b) => (b.filename > a.filename) ? -1 : (b.filename < a.filename) ? 1 : 0);

                fileListDiv.innerHTML = "";

                for(let i in fileListData) {
                    const currentFile = fileListData[i];
                    
                    let elem = document.createElement("li");
                    let innerButton = document.createElement("button");
                    innerButton.currentFile = currentFile;
                    innerButton.innerText = currentFile.filename;
                    innerButton.onclick = loadFile(innerButton);
                    elem.append(innerButton);

                    fileListDiv.append(elem);
                }

                passwordDiv.style.display = 'none';
                okDiv.style.display = 'block';
                statusDiv.innerText = "";
                audio = document.createElement("audio"); 
                audio.controls = true;
                audio.id = "audio";
                bottomDiv.insertBefore(audio, statusDiv);
            } catch(e) {
                updateStatusDiv("Failed to load file, invalid password maybe? " + e);
            }
        }

        unlockBtn.onclick = function() {
            utils.axios_get('i', updateStatusDiv).then(function(response) {
                decryptData(response.data, password.value, updateStatusDiv)
                .then(function(decodedBytes) {
                    loadList(decodedBytes.toString());
                })
                .catch(function(error) {
                    updateStatusDiv("Failed to load file, invalid password maybe? " + error);
                });
            });
        };
    }
})()