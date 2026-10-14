import { Pool, type PoolClient, type QueryResultRow } from 'pg';
const globalPool = globalThis as typeof globalThis & { __orbittaBookingPool?: Pool };
export function pool() {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
 if (!globalPool.__orbittaBookingPool) globalPool.__orbittaBookingPool = new Pool({connectionString: process.env.DATABASE_URL, max:5, idleTimeoutMillis:10000, connectionTimeoutMillis:7000});
 return globalPool.__orbittaBookingPool;
}
export async function sql<T extends QueryResultRow>(text:string,params:unknown[]=[]):Promise<T[]> {
 const result=await pool().query<T>(text,params);return result.rows;
}
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
 const client=await pool().connect();
 try{await client.query('BEGIN');const value=await fn(client);await client.query('COMMIT');return value;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
