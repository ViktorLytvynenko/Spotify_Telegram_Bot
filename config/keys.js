import keysProd from './keys_prod.js';
import keysDev from './keys_dev.js';

const keys = process.env.NODE_ENV === "production" ? keysProd : keysDev;

export default keys;