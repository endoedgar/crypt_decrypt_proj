#!/bin/bash

browserify -p tinyify scripts/app.js -o bundle.js 
mv bundle.js ../restrict/bundle.js
cp index.htm ../restrict/index.htm
cp style.css ../restrict/style.css
