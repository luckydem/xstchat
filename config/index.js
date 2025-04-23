import { connect } from '@existdb/node-exist';
import dotenv from 'dotenv';
dotenv.config();

export const EXIST_DB = connect({
    basic_auth: { user: 'admin', pass: process.env.EXIST_PASS },
    protocol: 'http:',    
    host: 'localhost',
    port: '8080',
    path: '/exist/xmlrpc'
});

