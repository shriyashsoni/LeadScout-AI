/**
 * KeyRotator provides a simple round-robin strategy for rotating through multiple API keys.
 */
class KeyRotator {
  constructor(keys) {
    this.keys = keys.filter(key => !!key); // Filter out empty keys
    this.currentIndex = 0;
  }

  getNextKey() {
    if (this.keys.length === 0) return null;
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  hasKeys() {
    return this.keys.length > 0;
  }
}

module.exports = KeyRotator;
