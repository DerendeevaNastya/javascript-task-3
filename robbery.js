'use strict';

const isStar = false;

const numberToDay = { 0: 'ПН', 1: 'ВТ', 2: 'СР' };
const minutesInHour = 60;
const minutesInDay = minutesInHour * 24;
const daysToMinutes = { 'ПН': 0, 'ВТ': 24 * 60, 'СР': 2 * 24 * 60 };
const wednesdayEnd = 4 * 24 * 60 - 1;


function timeString(stringTime, bankTimeZone) {
    const [day, time] = stringTime.split(' ');
    const [hour, minute, timeZone] = time.split(/\+|:/);

    return daysToMinutes[day] + (parseInt(hour) + bankTimeZone - parseInt(timeZone)) * 60 +
        parseInt(minute);
}

function sortByFrom(a, b) {
    return a.from - b.from;
}

function getTimeSections(sections, bankTimeZone) {
    sections.sort(sortByFrom);
    const newSections = [];
    let lastBorder = 0;
    for (let s = 0; s < sections.length; s++) {
        let from = timeString(sections[s].from, bankTimeZone);
        let to = timeString(sections[s].to, bankTimeZone);
        newSections.push({ from: lastBorder, to: from });
        lastBorder = to;
        if (s === sections.length - 1) {
            newSections.push({ from: lastBorder, to: wednesdayEnd });
        }
    }
    if (newSections.length === 0) {
        newSections.push({ from: 0, to: wednesdayEnd });
    }

    return newSections;
}

function sortByModule(a, b) {
    return Math.abs(a) - Math.abs(b);
}

function selectMany(f) {
    return function (acc, b) {
        return acc.concat(f(b));
    };
}

function getBorders(first, second) {
    return first
        .reduce(selectMany(x => [x.from, -x.to]), [])
        .concat(
            second.reduce(selectMany(x => [x.from, -x.to]), [])
        )
        .sort(sortByModule);
}

function getCommonTimeSections(first, second) {
    let commonTimeSections = [];
    let borders = getBorders(first, second);
    let section = { from: -1, to: -1 };
    let counter = 0;
    for (let b of borders) {
        counter += b >= 0 ? 1 : -1;
        if (counter === 2) {
            section.from = b;
        }
        if (counter === 1 && b < 0) {
            section.to = b;
            commonTimeSections.push({ from: section.from, to: -section.to });
            section = { from: -1, to: -1 };
        }
    }

    return commonTimeSections;
}

function getTimeForBank(time) {
    const [hour, minute] = time.split(/\+|:/);

    return parseInt(minute) + parseInt(hour) * 60;
}

function getBankTime(workingHours) {
    let fromMinute = getTimeForBank(workingHours.from);
    let toMinute = getTimeForBank(workingHours.to);
    let sections = [];
    for (let i = 0; i < 3; i++) {
        sections.push({ from: fromMinute + i * 24 * 60, to: toMinute + i * 24 * 60 });
    }

    return sections;
}

function fillFreeTime(schedule, workingHours) {
    const bankTimezone = parseInt(workingHours.from.split('+')[1]);
    const dannyFreeTime = getTimeSections(schedule.Danny, bankTimezone);
    const rustyFreeTime = getTimeSections(schedule.Rusty, bankTimezone);
    const linusFreeTime = getTimeSections(schedule.Linus, bankTimezone);
    const bankTime = getBankTime(workingHours);

    let commonSections = getCommonTimeSections(dannyFreeTime, rustyFreeTime);
    commonSections = getCommonTimeSections(commonSections, linusFreeTime);
    commonSections = getCommonTimeSections(commonSections, bankTime);

    return commonSections;
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
    const times = fillFreeTime(schedule, workingHours);
    let time = -1;
    for (let s of times) {
        if (typeof duration === 'number' && s.to - s.from >= duration) {
            time = s.from;
            break;
        }
    }

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return time !== -1;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например, "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (time === -1) {
                return '';
            }
            let day = numberToDay[Math.floor(time / (minutesInDay))];
            let hour = Math.floor((time - daysToMinutes[day]) / 60);
            let minute = time % minutesInHour;

            template = template
                .replace('%DD', day)
                .replace('%HH', hour < 10 ? '0' + String(hour) : String(hour))
                .replace('%MM', minute < 10 ? '0' + String(minute) : String(minute));

            return template;
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            return false;
        }
    };
}

module.exports = {
    getAppropriateMoment,

    isStar
};
