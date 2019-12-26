#!/usr/bin/python
# -*- coding: utf-8 -*-

import json
import subprocess
import os
import magic
from random import choice
import string

# based on https://stackoverflow.com/questions/367586/generating-random-text-strings-of-a-given-pattern
def GenPasswd2(length=8, chars=string.letters + string.digits):
    return ''.join([choice(chars) for i in range(length)])

mime = magic.Magic(mime=True)

pword = str(raw_input("Enter password: "))

inFolder = "original/"
outFolder = "../../restricted/data/"

data = []

for root, dirs, files in os.walk(inFolder):
	for filename in files:
		completeFilename = os.path.join(root, filename)
		data.append({
			"filename": filename,
			"type": mime.from_file(completeFilename),
			"cryptname": GenPasswd2(16),
			"password": GenPasswd2(32),
		})

for root, dirs, files in os.walk(outFolder):
	for filename in files:
		os.remove(os.path.join(root, filename))

offset = 0
dataFileName = GenPasswd2(32)
dest = open(outFolder + dataFileName, "ab") 
maxSize = 100000000
for f in data:
	subprocess.call(['openssl', 'enc', '-aes-256-ctr', '-in', inFolder + f['filename'], '-out', outFolder + f['cryptname'], '-pass', "pass:"+f['password'], '-pbkdf2'])
	f['length'] = os.path.getsize(outFolder + f['cryptname'])
	if(offset + f['length'] > maxSize):
		dest.close()
		dataFileName = GenPasswd2(32)
		offset = 0
		dest = open(outFolder + dataFileName, "ab") 
	f['offset'] = offset
	f['dataFile'] = dataFileName
	offset += f['length'];
	with open(outFolder + f['cryptname'], "rb") as src:
		dest.write(src.read())
	os.remove(outFolder + f['cryptname'])
	del f['cryptname']
dest.close()

with open('index.json', 'w') as json_file:
	json.dump(data, json_file)

subprocess.call(['openssl', 'enc', '-aes-256-ctr', '-in', 'index.json', '-out', outFolder + "i", '-pass', "pass:"+pword, '-pbkdf2', '-p'])
os.remove('index.json')
