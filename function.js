function convertTo24HourFormat(time) {
    const [timePart, amPm] = time.split(' ');
    let [hours, minutes, seconds] = timePart.split(':');

    if (amPm === 'PM' && hours !== '12') {
        hours = String(Number(hours) + 12);
    } else if (amPm === 'AM' && hours === '12') {
        hours = '00';
    }

    return `${hours}:${minutes}:${seconds}`;
}

module.exports = {
    convertTo24HourFormat
};