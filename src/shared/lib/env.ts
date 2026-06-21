type NodeEnv = 'development' | 'production';

const currentEnv = (process.env.NODE_ENV as NodeEnv) || 'development';

export const isProd = currentEnv === 'production';
export const isDev = currentEnv === 'development';
