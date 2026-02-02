import { configDotenv } from 'dotenv';

import db from './connectdatabase.js';
import { statusdatecalculatepms } from './functions.js';

configDotenv();

export const save_evaluation = async (item) => {
    const allowedTables = ['part1', 'part2'];
    const { parttype_id, employee_id, evaluate_id, type, evaluations } = item.payload;
    let insert = '', values = [];
    if (parttype_id === 'part1' || parttype_id === 'part2') {
        if (!allowedTables.includes(parttype_id)) throw new Error('Invalid parttype_id');
        insert = `insert into ${parttype_id} (part_id, part_rating, part_weight, part_comment, employee_id, evaluator_id, part_type, part_status) values ?`;
        values = evaluations.map(item => ([ item.part_id, item.rating, item.part_weight, item.comment, employee_id, evaluate_id, type, statusdatecalculatepms(new Date()) ]));
    } else if (parttype_id === 'part3') {
        insert = `insert into part3 (part_strength, part_topic, part_htcg, part_period, employee_id, evaluator_id, part_type, part_status) values ?`;
        values = evaluations.map(item => ([ item.strength, item.topic, item.htcg, item.period, employee_id, evaluate_id, type, statusdatecalculatepms(new Date()) ]));
    } else if (parttype_id === 'part4') {
        insert = `insert into part4 (part_impact, part_po, part_period, part_projectdetail, employee_id, evaluator_id, part_type, part_status) values ?`;
        values = evaluations.map(item => ([ item.impact, item.po, item.period, item.projectdetail, employee_id, evaluate_id, type, statusdatecalculatepms(new Date()) ]));
    } else if (parttype_id === 'part5') {
        insert = `insert into part5 (part_id, part_comment, employee_id, evaluator_id, part_type, part_status) values ?`;
        values = evaluations.map(item => ([ item.part_id, item.comment, employee_id, evaluate_id, type, statusdatecalculatepms(new Date()) ]));
    }
    const [result_insert] = await db.connectdatabase_pmssystem.query(insert, [values]);
    if (result_insert.affectedRows > 0) {
        return 'success';
    } else {
        return 'fail';
    }
}