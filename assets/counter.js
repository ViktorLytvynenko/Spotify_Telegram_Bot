module.exports.counter = (duration_ms) => {
    const seconds = Math.floor(duration_ms / 1000);
    const minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    remainingSeconds = remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;
    return minutes + ":" + remainingSeconds;
}

