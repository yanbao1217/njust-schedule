import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { AuthRequiredError } from '@jackwener/opencli/errors';
import { calcWeekNumber, parseSchedulePage, parseWeekExpression } from './utils.js';
import './schedule.js';

const FIXTURE_HTML = `
<html>
  <body>
    <select id="zc">
      <option value="">(全部)</option>
      <option value="1">第1周</option>
      <option value="2">第2周</option>
      <option value="3">第3周</option>
    </select>
    <select id="xnxq01id">
      <option value="2025-2026-1">2025-2026-1</option>
      <option value="2025-2026-2" selected="selected">2025-2026-2</option>
    </select>
    <table id="kbtable">
      <tr>
        <th></th>
        <th>星期一</th>
        <th>星期二</th>
        <th>星期三</th>
        <th>星期四</th>
        <th>星期五</th>
        <th>星期六</th>
        <th>星期日</th>
      </tr>
      <tr>
        <th>第一大节</th>
        <td><div class="kbcontent">示例课程A<br/><font title="老师">教师甲</font><br/><font title="周次(节次)">1-10(周)</font><br/><font title="教室">教学楼A101</font><br/></div></td>
        <td><div class="kbcontent">&nbsp;</div></td>
        <td><div class="kbcontent">&nbsp;</div></td>
        <td><div class="kbcontent">示例课程B<br/><font title="分组名">示例分组</font><br/><font title="老师">教师乙</font><br/><font title="周次(节次)">1-16(周)</font><br/><font title="教室">实验室C202</font><br/></div></td>
        <td><div class="kbcontent">&nbsp;</div></td>
        <td><div class="kbcontent">&nbsp;</div></td>
        <td><div class="kbcontent">&nbsp;</div></td>
      </tr>
    </table>
    <table id="dataList">
      <tr>
        <th>序号</th><th>课程号</th><th>课序号</th><th>课程名称</th><th>教师</th><th>时间</th><th>学分</th><th>地点</th>
      </tr>
      <tr>
        <td>1</td><td>TEST1001</td><td>1</td><td>示例课程A</td><td>教师甲</td><td>星期一(02-03小节)</td><td>3</td><td>教学楼A101</td>
      </tr>
      <tr>
        <td>2</td><td>TEST2002</td><td>2</td><td>示例课程B</td><td>教师乙</td><td>星期四(06-07小节)</td><td>2</td><td>实验室C202</td>
      </tr>
    </table>
  </body>
</html>
`;

describe('njust schedule', () => {
  it('parses schedule HTML into normalized rows', () => {
    const parsed = parseSchedulePage(FIXTURE_HTML);
    expect(parsed.selectedTerm).toBe('2025-2026-2');
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]).toMatchObject({
      weekday: 1,
      sections: '02-03',
      course: '示例课程A',
      teacher: '教师甲',
      classroom: '教学楼A101',
      weekText: '1-10(周)',
    });
    expect(parsed.entries[1]).toMatchObject({
      weekday: 4,
      sections: '06-07',
      course: '示例课程B',
      groupName: '示例分组',
    });
  });

  it('computes teaching week from term start', () => {
    expect(calcWeekNumber(new Date(2026, 1, 23), new Date(2026, 3, 7))).toBe(7);
  });

  it('parses odd and even week expressions', () => {
    expect(parseWeekExpression('1-16周(单)')).toMatchObject({
      odd: true,
      even: false,
      ranges: [{ start: 1, end: 16 }],
    });
  });

  it('registers command and formats matching rows', async () => {
    const cmd = getRegistry().get('njust/schedule');
    expect(cmd?.func).toBeTypeOf('function');

    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(FIXTURE_HTML),
    };

    const rows = await cmd.func(page, { week: 2, day: 'mon' });
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([
      {
        weekday: 'Mon',
        sections: '02-03',
        course: '示例课程A',
        teacher: '教师甲',
        classroom: '教学楼A101',
        time: '02-03',
        weeks: '1-10(周)',
      },
    ]);
  });

  it('maps missing kbtable HTML to auth error', async () => {
    const cmd = getRegistry().get('njust/schedule');
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('<html><title>统一身份认证</title></html>'),
    };

    await expect(cmd.func(page, { week: 2 })).rejects.toBeInstanceOf(AuthRequiredError);
  });
});
