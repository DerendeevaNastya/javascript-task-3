'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
const isStar = false;

const daysToMinutes = { 'ПН': 0, 'ВТ': 24 * 60, 'СР': 48 * 60 };
const numberToDay = { 0: 'ПН', 1: 'ВТ', 2: 'СР' };

function getTime(stringTime, bankTimeZone) {
    let timeZone = parseInt(stringTime.split('+')[1]);
    let day = stringTime.split(' ')[0];
    let hour = parseInt(stringTime.split(' ')[1].split(':')[0]) + (bankTimeZone - timeZone);
    let minute = parseInt(stringTime.split(' ')[1].split(':')[1]);

    return daysToMinutes[day] + hour * 60 + minute;
}

function getTimeSections(sections, bankTimeZone) {
    let newSections = [];
    let lastBorder = 0;
    for (let s = 0; s < sections.length; s++) {
        let from = getTime(sections[s].from, bankTimeZone);
        let to = getTime(sections[s].to, bankTimeZone);
        newSections.push({ from: lastBorder, to: from });
        lastBorder = to;
        if (s === sections.length - 1) {
            newSections.push({ from: lastBorder, to: 4 * 24 * 60 - 1 });
        }
    }
    if (newSections.length === 0) {
        newSections.push({ from: 0, to: 4 * 24 * 60 - 1 });
    }

    return newSections;
}

function sortByModule(a, b) {

    return Math.abs(a) - Math.abs(b);
}

function getBorders(first, second) {
    let borders = [];
    for (let f of first) {
        borders.push(f.from);
        borders.push(-f.to);
    }
    for (let s of second) {
        borders.push(s.from);
        borders.push(-s.to);
    }
    borders.sort(sortByModule);

    return borders;
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
    let hour = parseInt(time.split(':')[0]);
    let minute = parseInt(time.split(':')[1].split('+')[0]);

    return minute + hour * 60;
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

function correctSchedule(schedule) {
    if (typeof schedule !== 'object') {

        return false;
    }
    if (typeof schedule.Danny === undefined ||
        typeof schedule.Rusty === undefined ||
        typeof schedule.Linus === undefined) {

        return false;
    }

    return true;
}

function correctWorkingHours(workingHours) {
    if (typeof workingHours !== 'object') {

        return false;
    }
    if (typeof workingHours.from !== 'string' || typeof workingHours.to !== 'string') {

        return false;
    }
    if (isNaN(getTimeForBank(workingHours.from)) || isNaN(getTimeForBank(workingHours.to))) {

        return false;
    }

    return true;
}

function fillFreeTime(schedule, workingHours) {
    if (!correctWorkingHours(workingHours) || !correctSchedule(schedule)) {

        return [];
    }
    const bankTimezone = parseInt(workingHours.from.split('+')[1]);
    let dannyFreeTime = getTimeSections(schedule.Danny, bankTimezone);
    let rustyFreeTime = getTimeSections(schedule.Rusty, bankTimezone);
    let linusFreeTime = getTimeSections(schedule.Linus, bankTimezone);
    let bankTime = getBankTime(workingHours);

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
    console.info(schedule, duration, workingHours);
    let times = fillFreeTime(schedule, workingHours);
    let time = -1;
    for (let s of times) {
        if (s.to - s.from >= duration) {
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
            let day = numberToDay[Math.floor(time / (24 * 60))];
            let hour = Math.floor((time - daysToMinutes[day]) / 60);
            let minute = time % 60;

            template = template.replace('%DD', day);
            template = template.replace('%HH', hour);
            template = template.replace('%MM', minute < 10 ? '0' + String(minute) : String(minute));

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
