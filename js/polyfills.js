"use strict";

if (!window.crypto) window.crypto = {};
if (!window.crypto.randomUUID) {
  window.crypto.randomUUID = function randomUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
      const random = Math.random() * 16 | 0;
      const value = character === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  };
}
