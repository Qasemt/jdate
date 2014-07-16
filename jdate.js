// Cache original `Date` class. User may set window.Date = JDate
var Date = window['Date'];

function digits_fa2en(text) {
	return text.replace(/[۰-۹]/g, function (d) {
		return String.fromCharCode(d.charCodeAt(0) - 1728);
	});
}
function pad2(number) {
	return number < 10 ? '0' + number: number;
}

function parseDate(string, convertToPersian) {
	/*
	 http://en.wikipedia.org/wiki/ISO_8601
	 http://dygraphs.com/date-formats.html
	 https://github.com/arshaw/xdate/blob/master/src/xdate.js#L414
	 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
	 tests:
	 +parseDate('2014') == +new Date('2014')
	 +parseDate('2014-2') == +new Date('2014-02')
	 +parseDate('2014-2-3') == +new Date('2014-02-03')
	 +parseDate('2014-02-03 12:11') == +new Date('2014/02/03 12:11')
	 +parseDate('2014-02-03T12:11') == +new Date('2014/02/03 12:11')
	 parseDate('2014/02/03T12:11') == undefined
	 +parseDate('2014/02/03 12:11:10.2') == +new Date('2014/02/03 12:11:10') + 200
	 +parseDate('2014/02/03 12:11:10.02') == +new Date('2014/02/03 12:11:10') + 20
	 parseDate('2014/02/03 12:11:10Z') == undefined
	 +parseDate('2014-02-03T12:11:10Z') == +new Date('2014-02-03T12:11:10Z')
	 +parseDate('2014-02-03T12:11:10+0000') == +new Date('2014-02-03T12:11:10Z')
	 +parseDate('2014-02-03T10:41:10+0130') == +new Date('2014-02-03T12:11:10Z')
	 */
	var re = /^(\d|\d\d|\d\d\d\d)(?:([-\/])(\d{1,2})(?:\2(\d|\d\d|\d\d\d\d))?)?(([ T])(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|([+-])(\d{2})(?::?(\d{2}))?)?)?$/,
		match = re.exec(string);
	// re.exec('2012-4-5 01:23:10.1111+0130')
	//  0                              1       2    3    4    5                      6    7     8     9     10      11       12   13    14
	// ["2012-4-5 01:23:10.1111+0330", "2012", "-", "4", "5", " 01:23:10.1111+0130", " ", "01", "23", "10", "1111", "+0330", "+", "03", "30"]
	if (!match) return;
	var separator = match[2],
		timeSeparator = match[6],
		year = +match[1],
		month = +match[3] || 1,
		day = +match[4] || 1,
		isISO = (separator != '/') && (match[6] != ' '),
		hour = +match[7] || 0,
		minute = +match[8] || 0,
		seconds = +match[9] || 0,
		millis = +('0.' + (match[10] || '0')) * 1000,
		tz = match[11],
		isNonLocal = isISO && (tz || !match[5]),
		tzOffset = (match[12] == '-' ? -1 : 1) * ((+match[13] || 0) * 60 + (+match[14] || 0));
	// timezone should be empty if dates are with / (2012/1/10)
	if ((tz || timeSeparator == 'T') && !isISO) return;
	// one and only-one of year/day should be 4-chars (2012/1/10 vs 10/1/2012)
	if ((day >= 1000) == (year >= 1000)) return;
	if (day >= 1000) {
		// year and day only can be swapped if using '/' as separator
		if (separator == '-') return;
		day = +match[1];
		year = day;
	}
	if (convertToPersian) {
		var persian = jd_to_gregorian(persian_to_jd(year, month, day));
		year = persian[0];
		month = persian[1];
		day = persian[2];
	}
	var date = new Date(year, month - 1, day, hour, minute, seconds, millis);
	console.log(date);
	if (isNonLocal) {
		date.setUTCMinutes(date.getUTCMinutes() - date.getTimezoneOffset() + tzOffset);
	}
	return date;
}

/**
 * @param {Object=} a
 * @param {Number=} month
 * @param {Number=} day
 * @param {Number=} hour
 * @param {Number=} minute
 * @param {Number=} second
 * @param {Number=} millisecond
 * @constructor
 * @extends {Date}
 */
function JDate(a, month, day, hour, minute, second, millisecond) {
	if (typeof a == 'string') {
		this._d = parseDate(digits_fa2en(a), true);
		if (!this._d) throw 'Cannot parse date string'
	} else if (arguments.length == 0)
		this._d = new Date();
	else if (arguments.length == 1) {
		this._d = new Date((a instanceof JDate)?a._d:a);
	} else {
		var persian = jd_to_gregorian(persian_to_jd(a, (month || 0) + 1, day || 1));
		this._d = new Date(persian[0], persian[1] - 1, persian[2], hour || 0, minute || 0, second || 0, millisecond || 0);
	}
	this['_date'] = this._d;
	this._cached_date_ts = null;
	this._cached_date = [0, 0, 0];
	this._cached_utc_date_ts = null;
	this._cached_utc_date = [0, 0, 0];
}

JDate.prototype = {
	_persianDate: function () {
		if (this._cached_date_ts != +this._d) {
			this._cached_date_ts = +this._d;
			this._cached_date = jd_to_persian(gregorian_to_jd(this._d.getFullYear(), this._d.getMonth() + 1, this._d.getDate()));
		}
		return this._cached_date
	},
	_persianUTCDate: function () {
		if (this._cached_utc_date_ts != +this._d) {
			this._cached_utc_date_ts = +this._d;
			this._cached_utc_date = jd_to_persian(gregorian_to_jd(this._d.getUTCFullYear(), this._d.getUTCMonth() + 1, this._d.getUTCDate()));
		}
		return this._cached_utc_date
	},
	_setPersianDate: function (which, value) {
		var persian = this._persianDate();
		persian[which] = value;
		var new_date = jd_to_gregorian(persian_to_jd(persian[0], persian[1], persian[2]));
		this._d.setFullYear(new_date[0]);
		this._d.setMonth(new_date[1] - 1);
		this._d.setDate(new_date[2]);
	},
	_setUTCPersianDate: function (which, value) {
		var persian = this._persianUTCDate();
		persian[which] = value;
		var new_date = jd_to_gregorian(persian_to_jd(persian[0], persian[1], persian[2]));
		this._d.setUTCFullYear(new_date[0]);
		this._d.setUTCMonth(new_date[1] - 1);
		this._d.setUTCDate(new_date[2]);
	}
};
JDate.prototype['getDate'] = function () {
	return this._persianDate()[2]
};
JDate.prototype['getMonth'] = function () {
	return this._persianDate()[1] - 1
};
JDate.prototype['getFullYear'] = function () {
	return this._persianDate()[0]
};
JDate.prototype['getUTCDate'] = function () {
	return this._persianUTCDate()[2]
};
JDate.prototype['getUTCMonth'] = function () {
	return this._persianUTCDate()[1] - 1
};
JDate.prototype['getUTCFullYear'] = function () {
	return this._persianUTCDate()[0]
};
JDate.prototype['setDate'] = function (v) {
	this._setPersianDate(2, v)
};
JDate.prototype['setFullYear'] = function (v) {
	this._setPersianDate(0, v)
};
JDate.prototype['setMonth'] = function (v) {
	this._setPersianDate(1, v + 1)
};
JDate.prototype['setUTCDate'] = function (v) {
	this._setUTCPersianDate(2, v)
};
JDate.prototype['setUTCFullYear'] = function (v) {
	this._setUTCPersianDate(0, v)
};
JDate.prototype['toLocaleString'] = function (v) {
	return this.getFullYear() + '/' + pad2(this.getMonth() + 1) + '/' + pad2(this.getDate()) + ' ' +
		pad2(this.getHours()) + ':' + pad2(this.getMinutes()) + ':' + pad2(this.getSeconds());
};
JDate.prototype['setUTCMonth'] = function (v) {
	this._setUTCPersianDate(1, v + 1)
};
JDate['now'] = Date.now;
JDate['parse'] = function (string) {
	new JDate(string)['getTime']()
};
JDate['UTC'] = function (year, month, date, hours, minutes, seconds, milliseconds) {
	var d = jd_to_gregorian(persian_to_jd(year, month + 1, date || 1));
	return Date.UTC(d[0], d[1] - 1, d[2], hours || 0, minutes || 0, seconds || 0, milliseconds || 0);
};
var i, dateProps = ('getHours getMilliseconds getMinutes getSeconds getTime getUTCDay getUTCHours ' +
		'getTimezoneOffset getUTCMilliseconds getUTCMinutes getUTCSeconds setHours setMilliseconds setMinutes ' +
		'setSeconds setTime setUTCHours setUTCMilliseconds setUTCMinutes setUTCSeconds toDateString toISOString ' +
		'toJSON toString toLocaleDateString toLocaleTimeString toTimeString toUTCString valueOf getDay')
			.split(' '),
	createWrapper = function (k) {
		return function (v) {
			return this._d[k](v)
		}
	};

for (i = 0; i < dateProps.length; i++)
	JDate.prototype[dateProps[i]] = createWrapper(dateProps[i]);
window['JDate'] = JDate;
