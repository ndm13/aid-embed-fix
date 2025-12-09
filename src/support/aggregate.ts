export function groupByKey<T extends Record<K, string>, K extends keyof T>(data: T[], key: K) {
    return data.reduce((result, record) => {
        if (!result[record[key]]) {
            result[record[key]] = [];
        }
        result[record[key]].push(record);
        return result;
    }, {} as Record<T[K], T[]>);
}

export function countByKey<T extends Record<K, string>, K extends keyof T>(data: T[], key: K) {
    return data.reduce((result, record) => {
        result[record[key]] = (result[record[key]] || 0) + 1;
        return result;
    }, {} as Record<T[K], number>);
}