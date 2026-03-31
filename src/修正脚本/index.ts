import { waitGlobalInitialized, eventOn, Mvu } from '@classes';

const 正确角色名 = ['殷姒', '珠罗刹', '知春困'];

// 简单的繁简转换映射表
const 简繁映射: Record<string, string> = {
  姒: '姒',
  罗: '羅',
  刹: '剎',
  春: '春',
  困: '睏',
};

// 检查是否包含繁体字
function toSimplified(str: string): string {
  let result = str;
  for (const [traditional, simplified] of Object.entries(简繁映射)) {
    result = result.replace(new RegExp(traditional, 'g'), simplified);
  }
  return result;
}

// 角色名纠错映射（可能的错字 → 正确名字）
const 角色名纠错: Record<string, string> = {};
for (const name of 正确角色名) {
  const simplified = toSimplified(name);
  if (simplified !== name) {
    角色名纠错[simplified] = name;
  }
  // 也添加其他可能的错字
  if (name === '殷姒') {
    角色名纠错['殷似'] = name;
    角色名纠错['殷刹'] = name;
    角色名纠错['银姒'] = name;
    角色名纠错['银罗'] = name;
    角色名纠错['殷罗刹'] = name;
  }
  if (name === '珠罗刹') {
    角色名纠错['珠罗'] = name;
    角色名纠错['珠刹'] = name;
    角色名纠错['猪罗刹'] = name;
  }
  if (name === '知春困') {
    角色名纠错['知春'] = name;
    角色名纠错['知睏'] = name;
    角色名纠错['春困'] = name;
  }
}

// 需要补全前缀的变量名
const 需要剧情前缀 = ['当前事件', '事件大纲', '当前幕'];

// 变量名纠错映射（可能的错字 → 正确变量名）
const 变量名纠错: Record<string, string> = {
  '当前事': '当前事件',
  '当前大': '当前事件',
  '事件': '当前事件',
  '当前剧情': '当前事件',
  '剧情': '当前事件',
  '事件大': '事件大纲',
  '大纲': '事件大纲',
  '当前幕': '当前幕',
  '幕': '当前幕',
};

async function init() {
  await waitGlobalInitialized('Mvu');

  eventOn(Mvu.events.COMMAND_PARSED, commands => {
    let modified = false;

    commands.forEach(command => {
      const cmdName = command.name;

      // 处理 set_var 和 get_var 等变量操作命令
      if (['set_var', 'get_var', 'add_var', 'sub_var', 'toggle_var', 'append_var', 'remove_var'].includes(cmdName)) {
        if (command.args && command.args.length > 0) {
          // 第一个参数是变量名
          let varName = command.args[0];

          // 1. 变量名纠错
          const correctedVarName = 变量名纠错[varName];
          if (correctedVarName) {
            varName = correctedVarName;
            modified = true;
          }

          // 2. 角色名纠错
          for (const [wrong, correct] of Object.entries(角色名纠错)) {
            if (varName.includes(wrong)) {
              varName = varName.replace(wrong, correct);
              modified = true;
            }
          }

          // 3. 如果是"个人属性"或"个人状态"但没有剧情前缀，自动加上
          if (varName === '个人属性' || varName === '个人状态') {
            varName = '剧情.' + varName;
            modified = true;
          }

          // 4. 如果是"当前事件"但没有剧情前缀，自动加上
          if (需要剧情前缀.includes(varName) && !varName.includes('剧情.')) {
            varName = '剧情.' + varName;
            modified = true;
          }

          command.args[0] = varName;
        }
      }

      // 处理 set_status 命令（角色状态更新）
      if (cmdName === 'set_status') {
        if (command.args && command.args.length > 0) {
          let charName = command.args[0];

          // 角色名纠错
          for (const [wrong, correct] of Object.entries(角色名纠错)) {
            if (charName.includes(wrong)) {
              charName = charName.replace(wrong, correct);
              modified = true;
            }
          }

          command.args[0] = charName;
        }
      }

      // 处理 add_card 或类似命令
      if (['add_card', 'set_card_status'].includes(cmdName)) {
        if (command.args && command.args.length > 0) {
          let charName = command.args[0];

          // 角色名纠错
          for (const [wrong, correct] of Object.entries(角色名纠错)) {
            if (charName.includes(wrong)) {
              charName = charName.replace(wrong, correct);
              modified = true;
            }
          }

          command.args[0] = charName;
        }
      }
    });

    if (modified) {
      console.info('[修正脚本] 已自动修正变量名/角色名');
    }
  });
}

$(() => {
  errorCatched(init)();
});
