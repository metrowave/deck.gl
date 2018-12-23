/* eslint-disable */
import GL from 'luma.gl/constants';
import {Texture2D, loadImages} from 'luma.gl';

const MAX_CANVAS_WIDTH = 256;
const MAX_CANVAS_HEIGHT = 768;

const DEFAULT_TEXTURE_MIN_FILTER = GL.LINEAR_MIPMAP_LINEAR;
// GL.LINEAR is the default value but explicitly set it here
const DEFAULT_TEXTURE_MAG_FILTER = GL.LINEAR;

const noop = () => {};

function nextPowOfTow(number) {
  return Math.pow(2, Math.ceil(Math.log(number) / Math.log(2)));
}

function buildRowMapping(mapping, columns, yOffset) {
  for (let i = 0; i < columns.length; i++) {
    const {icon, xOffset} = columns[i];
    mapping[icon.url] = Object.assign({}, icon, {
      x: xOffset,
      y: yOffset
    });
  }
}

function buildMapping({icons, maxCanvasWidth, maxCanvasHeight}) {
  let xOffset = 0;
  let yOffset = 0;
  let rowHeight = 0;

  let columns = [];
  const mapping = {};

  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    if (!mapping[icon.url]) {
      const {height, width} = icon;

      // fill one row
      if (xOffset + width > maxCanvasWidth) {
        buildRowMapping(mapping, columns, yOffset);

        xOffset = 0;
        yOffset = rowHeight + yOffset;
        rowHeight = 0;
        columns = [];

        if (yOffset > maxCanvasHeight) {
          // TODO
        }
      }

      columns.push({
        icon,
        xOffset
      });

      xOffset = xOffset + width;
      rowHeight = Math.max(rowHeight, height);
    }
  }

  if (columns.length > 0) {
    buildRowMapping(mapping, columns, yOffset);
  }

  const canvasHeight = nextPowOfTow(rowHeight + yOffset);
  return {
    mapping,
    canvasHeight // yOffset + height of last row
  };
}

export default class IconManager {
  constructor(
    gl,
    {
      data,
      getIcon,
      onTextureUpdate = noop,
      maxCanvasWidth = MAX_CANVAS_WIDTH,
      maxCanvasHeight = MAX_CANVAS_HEIGHT
    }
  ) {
    this.gl = gl;
    this.getIcon = getIcon;
    this.onTextureUpdate = onTextureUpdate;
    this.maxCanvasWidth = maxCanvasWidth;
    this.maxCanvasHeight = maxCanvasHeight;

    // extract icons from data
    this._icons = this._getIcons(data);
    this._generateTexture();
  }

  setData(data) {
    this.data = data;
    const nextIcons = this._getIcons(this.data);
    if (this._changed(this._icons, nextIcons)) {
      this._icons = nextIcons;
      this._generateTexture();
    }
  }

  // getters
  get mapping() {
    return this._mapping;
  }

  get texture() {
    return this._texture;
  }

  _changed(oldIcons, icons) {
    return Object.keys(icons).every(icon => oldIcons[icon.url]);
  }

  _getIcons(data) {
    if (!data) {
      return null;
    }

    return data.reduce((resMap, point) => {
      const icon = this.getIcon(point);
      if (!resMap[icon.url]) {
        resMap[icon.url] = icon;
      }
      return resMap;
    }, {});
  }

  _generateTexture() {
    if (this._icons) {
      // generate icon mapping
      const {mapping, canvasHeight} = buildMapping({
        icons: Object.values(this._icons),
        maxCanvasWidth: this.maxCanvasWidth,
        maxCanvasHeight: this.maxCanvasHeight
      });

      this._mapping = mapping;

      // create new texture
      this._texture = new Texture2D(this.gl, {
        width: this.maxCanvasWidth,
        height: canvasHeight
      });

      // load images
      this._loadImages();
    }
  }

  _loadImages() {
    const icons = Object.values(this._icons);
    for (let i = 0; i < icons.length; i++) {
      const icon = icons[i];
      if (icon.url) {
        loadImages({urls: [icon.url]}).then(([data]) => {
          const mapping = this._mapping[icon.url];
          const {x, y, width, height} = mapping;

          // update texture
          this._texture.setSubImageData({
            data,
            x,
            y,
            width,
            height,
            parameters: {
              [GL.TEXTURE_MIN_FILTER]: DEFAULT_TEXTURE_MIN_FILTER,
              [GL.TEXTURE_MAG_FILTER]: DEFAULT_TEXTURE_MAG_FILTER,
              [GL.UNPACK_FLIP_Y_WEBGL]: true
            }
          });
          // Call to regenerate mipmaps after modifying texture(s)
          this._texture.generateMipmap();

          this.onTextureUpdate(this._texture);
        });
      }
    }
  }
}
