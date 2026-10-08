import { randomBytes, scryptSync } from 'node:crypto';
import { stdin, stdout } from 'node:process';

if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this script in an interactive terminal so the password stays hidden.');
}

stdout.write('Password: ');
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

let password = '';
stdin.on('data', key => {
    if (key === '\u0003') {
        stdout.write('\nCancelled.\n');
        process.exit(1);
    }
    if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\n');
        if (password.length < 12) {
            throw new Error('Use a password with at least 12 characters.');
        }

        const salt = randomBytes(16).toString('hex');
        const hash = scryptSync(password, salt, 64).toString('hex');
        password = '';
        stdout.write(`scrypt$${salt}$${hash}\n`);
        return;
    }
    if (key === '\u007f' || key === '\b') {
        password = password.slice(0, -1);
        return;
    }
    password += key;
});
