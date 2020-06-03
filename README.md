# app-download.node
APP Download Server in NodeJS

# Installation
```NodeJS
npm install
npm start
```

# Usages
browser at: http://localhost:8060/adminn/  
app download: http://localhost:8060/add/[project-path].dn

# Install GraphicsMagick
ftp://ftp.graphicsmagick.org/pub/GraphicsMagick/
```Shell
yum install -y gcc libpng libjpeg giflib libpng-devel libjpeg-devel giflib-devel ghostscript libtiff libtiff-devel freetype freetype-devel

cd /usr/local/
wget ftp://ftp.graphicsmagick.org/pub/GraphicsMagick/1.3/GraphicsMagick-1.3.35.tar.gz
tar -zxvf GraphicsMagick-1.3.35.tar.gz

cd /usr/local/GraphicsMagick-1.3.35
./configure --prefix=/usr/local/GraphicsMagick-1.3.35
make && make install

ln -s /usr/local/GraphicsMagick-1.3.35/bin/gm /usr/bin/

gm version
gm convert -list formats
```

# Update Logs
200602: node scripts/update-200602.js
