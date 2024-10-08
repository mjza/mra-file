/**
 * Generates a random string of a specified length.
 * @param {number} [length=8] - The length of the string to generate. Default is 8 characters.
 * @returns {string} A random string of the specified length.
 */
const generateRandomString = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
};

export { generateRandomString };

/**
 * Generates a mock user object for a user route.
 * This function creates a random username and uses it to construct an email.
 * It also sets a predefined password and a login redirect URL.
 * 
 * @returns {Object} An object containing username, email, password, and loginRedirectURL.
 */
const generateMockUserRoute = () => {
    var username = generateRandomString();
    return {
        username: username,
        email: 'info@example.com',
        password: 'Password1$',
        loginRedirectURL: 'http://example.com/'
    }
};

export { generateMockUserRoute };

/**
 * Generates a custom UUID that includes the current UTC date and time,
 * followed by a random portion to ensure uniqueness.
 *
 * The UUID format is as follows:
 * YYMMDDHHMMSSmmm-rand
 * - YY: last two digits of the year
 * - MM: month (01-12)
 * - DD: day (01-31)
 * - HH: hour (00-23)
 * - MM: minute (00-59)
 * - SS: second (00-59)
 * - mmm: milliseconds (000-999)
 * - rand: a random string in the format xxxx-xxxx-xxxx where x is a hexadecimal digit
 *
 * @returns {string} A custom UUID string containing the current UTC date and time, and a random portion.
 *
 * @example
 * const uuid = generateUUIDWithUTCTimestamp();
 * console.log(uuid); // Output: "240515124530456-4d5a-1f3e-8a7b"
 */
function generateUUIDWithUTCTimestamp() {
    // Get current date and time in UTC
    const now = new Date();
    const year = now.getUTCFullYear().toString().slice(-2); // last 2 digits of the year
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0'); // months are 0-based
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const seconds = now.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = now.getUTCMilliseconds().toString().padStart(3, '0');

    // Generate random part
    const randomPart = 'xxxx-xxxx-xxxx'.replace(/[x]/g, function () {
        const r = Math.random() * 16 | 0;
        return r.toString(16);
    });

    // Combine parts into custom UUID
    const uuid = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}-${randomPart}`;

    return uuid;
}


export { generateUUIDWithUTCTimestamp };
