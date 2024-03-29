const NexusClient = require("grindery-nexus-client").default;
const jwt_decode = require("jwt-decode");

const ApiEndpoint = require("../api");
baseUrl = ApiEndpoint.baseUrl.api;

const driver_id = "replaceTriggerCamelCase";
const replaceTriggerCamelCase_hidden = require("./replaceTriggerCamelCase_hidden");

//uniqueID Generate Token ID
function uniqueID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4();
}

//GET Creator ID - needed to add creator ID to workflow object, decode from access_token
/* Decoded Structure
{
  aud: 'urn:grindery:access-token:v1',
  sub: 'eip155:1:0x14619166E21b465c859cEA1A9173888557603652',
  iat: 1671474250,
  iss: 'urn:grindery:orchestrator',
  exp: 1671477850
}
*/

const creatorID = async (z, bundle) => {
  try {
    const token = bundle.authData.access_token;
    var decoded = jwt_decode(token);
    z.console.log("Decoded Token: ", decoded);
    return decoded.sub;
  } catch (error) {
    //force token refresh if invalid
    if (error.message === "Invalid access token") {
      z.console.log(
        "Auth Error in creatorID function (replaceTriggerCamelCase.js)",
        error.message
      );
      throw new z.errors.RefreshAuthError();
    } else {
      z.console.log(
        "Error in creatorID function (replaceTriggerCamelCase.js)",
        error.message
      );
    }
  }
};

// triggers on a new trigger_from_a_grindery_workflow with a certain tag
const perform = async (z, bundle) => {
  return [bundle.cleanedRequest];
};

//This method retrieves sample documents from Grindery Drivers via REST API
//API endpoint here: https://github.com/connex-clientaccess/connex-zapier-grindery/blob/master/index.js
const performTransactionList = async (z, bundle) => {
  const options = {
    url: `${baseUrl}/performList`,
    headers: {
      Authorization: `Bearer ${bundle.authData.access_token}`,
      accept: "application/json",
    },
    method: "POST",
    params: {
      limit: 1,
    },
    body: {
      trigger_id: driver_id, //driver ID e.g. evmWallet
      trigger_item: bundle.inputData.trigger_id, //trigger ID e.g. newTransaction
    },
  };
  const response = await z.request(options);
  const headerData = await JSON.stringify(response.headers);
  const responseHeader = (headerData) => {
    return JSON.parse(headerData);
  };

  if (response.status !== 200) {
    throw new z.errors.Error(`Error with status code: ${response.status}`);
  }
  const data = await JSON.parse(response.content);

  if (Object.keys(data.items).length === 0) {
    return [];
  } else {
    return data.items;
  }
};

//subscribe this hook to the endpoint
const subscribeHook = async (z, bundle) => {
  let token = uniqueID(); //generate a unique_id and register the webhook
  const options = {
    url: `${baseUrl}/webhooks`,
    method: "POST",
    body: {
      url: bundle.targetUrl,
      token: token,
    },
  };

  // show the ui based on driver and trigger selected.
  return z.request(options).then(async (response) => {
    //create workflow, with zapier action at the end with token
    let input = {}; //trigger input object
    let output = {}; //output object from trigger
    let trigger = {}; //trigger object
    let creator = await creatorID(z, bundle); //find the creator id from the access_token
    //z.console.log("Creator Returned", creator);
    let action = {}; //action after creating trigger
    let workflow = {}; //main workflow object
    try {
      const client = new NexusClient(bundle.authData.access_token);
      let thisDriver = await client.connector.get({ driverKey: driver_id }); //
      let driver_triggers = thisDriver.triggers;
      z.console.log("Selected Driver ", driver_triggers);

      if (driver_triggers) {
        //get the selected action
        let this_selected_trigger = driver_triggers.filter(
          (trigger) => trigger.key === bundle.inputData.trigger_id
        );
        if (this_selected_trigger.length >= 1) {
          let this_trigger = this_selected_trigger[0];
          let allChoices = [];
          z.console.log("Trigger Object: ", trigger);
          if (this_trigger.operation.inputFields.length >= 1) {
            this_trigger.operation.inputFields.map((inputField) => {
              z.console.log("Trigger Input Field: ", inputField);
              if (inputField.choices) {
                inputField.choices.map((choice) => {
                  allChoices.push(choice.value);
                });
              }
              if (inputField.computed === true) {
                input = {
                  [inputField.key]: inputField.default,
                  ...input,
                };
              } else {
                if (bundle.inputData[inputField.key] === "all") {
                  input = {
                    [inputField.key]: allChoices,
                    ...input,
                  };
                } else {
                  input = {
                    [inputField.key]: bundle.inputData[inputField.key],
                    ...input,
                  };
                }
              }
            });
          }
          const credentials = await client.credentials.list({
            connectorId: bundle.inputData.driver_id,
            environment: "production",
          });
          const credential = credentials.find(
            (c) =>
              c.key === bundle.inputData.auth_credentials ||
              c.key === bundle.inputData.auth_new_account
          );
          const authentication = (credential && credential.token) || undefined;
          const authenticationKey = (credential && credential.key) || undefined;

          if (input.auth_credentials) {
            delete input.auth_credentials;
          }
          if (input.auth_copy) {
            delete input.auth_copy;
          }
          if (input.auth_completed) {
            delete input.auth_completed;
          }
          if (input.auth_new_account) {
            delete input.auth_new_account;
          }

          if (this_trigger.operation.outputFields.length >= 1) {
            this_trigger.operation.outputFields.map((outField) => {
              output = {
                [outField.label]: `{{trigger.${[outField.key]}}}`,
                ...output,
              };
            });
          }
          z.console.log("Selected Trigger ", this_trigger);
          trigger = {
            type: "trigger",
            connector: driver_id,
            operation: bundle.inputData.trigger_id,
            input: input,
            authentication,
            authenticationKey,
          };
          z.console.log("Input Object: ", input);
          action = [
            {
              type: "action",
              connector: "zapier",
              operation: "triggerZap",
              input: {
                token: token,
                data: JSON.stringify(output),
              },
            },
          ];
          z.console.log("Action Object: ", action);

          workflow = {
            state: "on",
            title: `Trigger a Zap on ${thisDriver.name} app ${this_trigger.name} event`,
            creator: creator,
            actions: action,
            trigger: trigger,
            source: "urn:grindery:zapier-gateway",
          };

          //z.console.log("Workflow Object: ", workflow);

          const user = client.user.get();
          //z.console.log("Attempting to create this workflow: ", workflow);
          const create_workflow_response = await client.workflow.create({
            workflow,
            workspaceKey: user.workspace || undefined,
          });

          const data = await z.JSON.parse(response.content);

          //TODO: handle possible errors
          const response_object = {
            workflow_key: create_workflow_response.key,
            ...data,
          };

          //save workflow for later
          const save_options = {
            url: `${baseUrl}/saveWorkflow`,
            method: "POST",
            body: {
              id: data.id,
              workflow: workflow,
            },
          };

          return z.request(save_options).then(async (response) => {
            z.console.log("saving workflow response: ", response);
            z.console.log(
              "Returned Object from Subscribe Action: ",
              response_object
            );
            return response_object;
          });
        }
      }
    } catch (error) {
      if (error.message === "Invalid access token") {
        z.console.log(
          "Line 216 - Auth Error in Subscribe Method (trigger_from_a_grindery_workflow)",
          error.message
        );
        throw new z.errors.RefreshAuthError();
      } else {
        z.console.log(
          "Error occured in trigger from a grindery workflow: ",
          error.message
        );
      }
    }
  });
};

const unsubscribeHook = async (z, bundle) => {
  // bundle.subscribeData contains the parsed response from the subscribeHook function.
  const hookId = bundle.subscribeData.id;
  const workflow_key = bundle.subscribeData.workflow_key;
  z.console.log("unsubscribe hook: ", hookId);

  const options = {
    url: `${baseUrl}/webhooks/${hookId}/${workflow_key}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${bundle.authData.access_token}`,
      accept: "application/json",
    },
  };

  const unsub_response = await z.request(options);
  if (unsub_response.status !== 200) {
    z.console.log(unsub_response);
  } else {
    return { message: "Unsubscribed: ", hookId };
  }
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#triggerschema
  key: "replaceTriggerCamelCase",
  noun: "replaceTriggerTitleCase Token",

  display: {
    label: "replaceLabel",
    description: "replaceDescription",
  },

  operation: {
    type: "hook",
    perform: perform,
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    performList: performTransactionList,
    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. They're optional.
    inputFields: [
      {
        key: "driver_id",
        type: "string",
        default: driver_id,
        altersDynamicFields: true,
        computed: true,
      },
      {
        key: "trigger_id",
        label: "Driver Trigger",
        type: "string",
        altersDynamicFields: true,
        dynamic: "replaceTriggerCamelCase_hidden.key",
      },
      async function (z, bundle) {
        console.log("Running Async function");
        const client = new NexusClient(bundle.authData.access_token);
        let this_cds_trigger_options = {};
        try {
          let response = await client.connector.get({ driverKey: driver_id });
          z.console.log("Driver Response: ", response);
          let driver_triggers = response.triggers;
          let choices = {};
          let triggersInputField = [];
          if (driver_triggers) {
            /*driver_triggers.map((trigger) => {

            })*/
            let this_selected_trigger = driver_triggers.filter(
              (trigger) => trigger.key === bundle.inputData.trigger_id
            );

            if (this_selected_trigger.length >= 0) {
              if (
                response.authentication &&
                response.authentication.type === "oauth2" &&
                this_selected_trigger[0].authentication !== "none"
              ) {
                const user = client.user.get();
                const credentials = await client.credentials.list({
                  connectorId: bundle.inputData.driver_id || "",
                  environment: "production",
                });
                z.console.log("credentials", credentials);
                const credentialsField = {
                  key: "auth_credentials",
                  label: "Select account",
                  type: "string",
                  altersDynamicFields: true,
                };
                let choices = {};
                credentials.map((cred) => {
                  choices[cred.key] = cred.name;
                });
                choices["add_new"] = "Sign in to a new account";
                credentialsField.choices = choices;

                triggersInputField.push(credentialsField);

                if (
                  bundle.inputData.auth_credentials &&
                  bundle.inputData.auth_credentials === "add_new"
                ) {
                  const authLink = `https://orchestrator.grindery.org/credentials/production/${
                    bundle.inputData.driver_id
                  }/auth?access_token=${
                    bundle.authData.access_token
                  }&redirect_uri=https://flow.grindery.org/complete_auth/${
                    user.workspace || "default"
                  }`;

                  triggersInputField.push({
                    key: "auth_copy",
                    label: "Authentication",
                    type: "copy",
                    helpText: `Please, click the link and follow sign-in process: [Sign-in](${authLink}).`,
                  });
                  triggersInputField.push({
                    key: "auth_completed",
                    label: "I have completed the sign in flow",
                    type: "boolean",
                    default: "false",
                    helpText:
                      "Set to TRUE once you are done with authentication",
                    altersDynamicFields: true,
                  });
                  z.console.log(
                    "typeof bundle.inputData.auth_completed",
                    typeof bundle.inputData.auth_completed
                  );
                  z.console.log(
                    "bundle.inputData.auth_completed",
                    bundle.inputData.auth_completed
                  );
                  if (
                    bundle.inputData.auth_completed &&
                    bundle.inputData.auth_completed !== "false" &&
                    credentials.length > 0
                  ) {
                    triggersInputField.push({
                      key: "auth_new_account",
                      label: "New account",
                      type: "string",
                      default: credentials[credentials.length - 1].key,
                      helpText: credentials[credentials.length - 1].name,
                      altersDynamicFields: true,
                    });
                  }
                }
              }
              z.console.log("Selected Driver: ", this_selected_trigger[0]);
              //filter computed:true
              filtered_trigger_input_fields =
                this_selected_trigger[0].operation.inputFields.filter(
                  (field) => !field.computed
                );
              if (filtered_trigger_input_fields) {
                filtered_trigger_input_fields.map((inputField) => {
                  z.console.log("Building Input Field: ", inputField);
                  let type = "";
                  switch (inputField.type) {
                    case "boolean":
                      type = "boolean";
                    case "text":
                      type = "text";
                    case "file":
                      type = "file";
                    case "password":
                      type = "password";
                    case "integer":
                      type = "integer";
                    case "number":
                      type = "number";
                    case "datetime":
                      type = "datetime";
                    case "string":
                    default:
                      type = "string";
                  }
                  let temp = {
                    key: inputField.key,
                    label: inputField.label,
                    helpText: inputField.helpText,
                    default: inputField.default,
                    type: type,
                  };
                  if (inputField.choices) {
                    let allChoices = [];
                    inputField.choices.map((choice) => {
                      allChoices.push(`"${[choice.value]}"`);
                      choices = {
                        [choice.value]: choice.label,
                        ...choices,
                      };
                    });
                    //inject all available blockchains into choices
                    choices = {
                      //[`[${allChoices}]`] : "All Supported Chains",
                      all: "All Supported Chains",
                      ...choices,
                    };
                    temp = {
                      choices: choices,
                      ...temp,
                    };
                  }
                  if (inputField.required) {
                    temp = {
                      required: true,
                      ...temp,
                    };
                  }
                  if (
                    response.authentication &&
                    response.authentication.type === "oauth2" &&
                    this_selected_trigger[0].authentication !== "none" &&
                    ((bundle.inputData.auth_credentials &&
                      bundle.inputData.auth_credentials === "add_new" &&
                      bundle.inputData.auth_completed &&
                      bundle.inputData.auth_completed !== "false") ||
                      (bundle.inputData.auth_credentials &&
                        bundle.inputData.auth_credentials !== "add_new"))
                  ) {
                    triggersInputField.push(temp);
                  } else {
                    if (
                      !response.authentication ||
                      response.authentication.type !== "oauth2" ||
                      this_selected_trigger[0].authentication === "none"
                    ) {
                      triggersInputField.push(temp);
                    }
                  }
                });
              }
              return triggersInputField;
            }
          } else {
            return {};
          }
        } catch (error) {
          z.console.log(
            "Auth Error in Trigger Grindery Workdlow (trigger_grindery_workflow.js)",
            error.message
          );
          if (error.message === "Invalid access token") {
            throw new z.errors.RefreshAuthError();
          }
        }
      },
    ],

    // In cases where Zapier needs to show an example record to the user, but we are unable to get a live example
    // from the API, Zapier will fallback to this hard-coded sample. It should reflect the data structure of
    // returned records, and have obvious placeholder values that we can show to any user.
    sample: {
      id: 1,
      test: "sample",
    },

    // If fields are custom to each user (like spreadsheet columns), `outputFields` can create human labels
    // For a more complete example of using dynamic fields see
    // https://github.com/zapier/zapier-platform/tree/master/packages/cli#customdynamic-fields
    // Alternatively, a static field definition can be provided, to specify labels for the fields
    outputFields: [
      // these are placeholders to match the example `perform` above
      // {key: 'id', label: 'Person ID'},
      // {key: 'name', label: 'Person Name'}
    ],
  },
};
