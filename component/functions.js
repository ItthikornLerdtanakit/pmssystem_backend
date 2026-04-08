export const statusdatecalculatepms = (date) => {
    const startRound = new Date(date); // กำหนดวันที่ที่ต้องการ
    const month = startRound.getMonth(); // เดือน (0 = มกราคม, 11 = ธันวาคม)
    const year = startRound.getFullYear(); // ปี
    if (month >= 1 && month <= 6) {
        return `1-${year}`; // กุมภาพันธ์ (1) ถึง กรกฎาคม (6)
    } else {
        const evaluationYear = month === 0 ? year - 1 : year; // สิงหาคม (7) ถึง มกราคม (0) (มกราคมเป็นของปีที่แล้ว)
        return `2-${evaluationYear}`;
    }
}

export const get_period = (date = new Date()) => {
    const month = date.getMonth() + 1; // 1–12
    const year = date.getFullYear();
    let targetYear = (month <= 2) ? year - 1 : year;
    if (month >= 3 && month <= 8) {
        return `1-${year}`;
    }
    return `2-${targetYear}`;
};
