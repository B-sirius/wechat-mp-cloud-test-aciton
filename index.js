const core = require("@actions/core");
const fetch = require('node-fetch');

const parseString = (keyName, value, required = false) => {
  if (required && !value) {
    throw Error(` ${keyName} required`)
  }
  if (!value) {
    return undefined;
  }
  return value;
}

const parseInt = (keyName, value, required = false) => {
  if (required && !value) {
    throw Error(`${keyName} required`);
  }
  if (!value) {
    return undefined;
  }
  const int = parseInt(value, 10);
  if (isNaN(int)) {
    throw Error(`${keyName} not valid`);
  }
  return int;
}

const parseArguments = () => {
  const token = core.getInput("token");
  const enId = core.getInput("group_en_id");
  const testType = core.getInput("test_type");
  const wxVersion = core.getInput("wx_version");
  const platforms = core.getInput("platforms");
  const selectedAndroidNum = core.getInput("selected_android_num");
  const selectedIosNum = core.getInput("selected_ios_num");
  const wxId = core.getInput("wx_id");
  const testPlanId = core.getInput("test_plan_id");
  const taskRunTime = core.getInput("task_run_time");
  const desc = core.getInput("desc");
  const miniumConfig = core.getInput("minium_config");
  const devAccountNo = core.getInput("dev_account_no");
  const virtualAccounts = core.getInput("virtual_accounts");
  const runMode = core.getInput("run_mode");
  const specialCloud = core.getInput("special_cloud");
  const deviceIds = core.getInput("device_ids");

  const arguments = {
    token: parseString('token', token, true),
    enId: parseString('group_en_id', enId, true),
    testType: parseInt('test_type', testType, true),
    wxVersion: parseInt('wx_version', wxVersion, true),
    platforms: parseString('test_type', platforms, true),
    selectedAndroidNum: parseInt('selected_android_num', selectedAndroidNum),
    selectedIosNum: parseInt('selected_ios_num', selectedIosNum),
    wxId: parseString('wx_id', wxId),
    testPlanId: parseString('test_plan_id', testPlanId),
    taskRunTime: parseInt('task_run_time', taskRunTime),
    desc: parseString('desc', desc),
    miniumConfig: parseString('minium_config', miniumConfig),
    devAccountNo: parseInt('dev_account_no', devAccountNo),
    virtualAccounts: parseString('virtual_accounts', virtualAccounts),
    runMode: parseInt('run_mode', runMode),
    specialCloud: parseString('special_cloud', specialCloud),
    deviceIds: parseString('device_ids', deviceIds)
  };

  Object.keys(arguments).map((key) => {
    if (!arguments[key]) {
      delete arguments[key]
    }
  })

  return arguments;
}

const startTask = async () => {
  try {
    const arguments = parseArguments();
    const response = await fetch('https://minitest.weixin.qq.com/thirdapi/plan', {
      method: 'POST',
      body: arguments
    }).json();
    const planId = response?.data?.plan_id;
  
    if (!planId) {
      throw new Error(`start task failed`)
    }
  
    return {
      planId,
      token: arguments.token,
      enId: arguments.enId,
    };
  } catch (error) {
    throw new Error(error)
  }
}

const checkTaskStatus = async ({ planId, token, enId }) => {
  try {
    await new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        const response = await fetch(`https://minitest.weixin.qq.com/thirdapi/plan?token=${token}&group_en_id=${enId}&plan_id=${planId}`).json();
        const status = response?.data?.status;
        if (!status) {
          clearInterval(intervalId);
          reject('check task status failed');``
        }
        switch(status) {
          case 1: {
            core.info('In the line...');
          }
          case 2: {
            core.info('Testing...')
          }
          case 11: {
            core.info('Test case not found')
            clearInterval(intervalId);
            reject('查询测试任务接口请求失败');
          }
          case 12: {
            core.info('Test job completed')
            clearInterval(intervalId);
            resolve();
          }
          case 15: {
            core.info('Test job timed out')
            clearInterval(intervalId);
          }
        }
      }, 20000)
    })
  } catch (error) {
    throw new Error(error);
  }
}

const getTaskReport = async ({ planId, token, enId }) => {
  try {
    const response = await fetch(`https://minitest.weixin.qq.com/thirdapi/report/static_resource?token=${token}&group_en_id=${enId}&plan_id=${planId}`).json();
    const reportLink = response?.download_url;
    return reportLink;
  } catch (error) {
    throw new Error(error);
  }
  
}

const run = async () => {
  try {
    const taskInfo = await startTask();
    await checkTaskStatus(taskInfo);
    const reportLink = await getTaskReport(taskInfo);
    core.info(`report link: ${reportLink}`)
    core.setOutput('report_link', reportLink)
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();