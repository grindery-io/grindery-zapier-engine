const NexusClient = require("grindery-nexus-client").default;

const driver_id = "replaceActionCamelCase";
const replaceActionCamelCase_action_hidden = require("../triggers/replaceActionCamelCase_action_hidden");

const perform = async (z, bundle) => {
  try {
    const client = new NexusClient(bundle.authData.access_token);
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

    let step = {
      authentication,
      authenticationKey,
    }; //step object
    let input = { ...bundle.inputData }; //input object
    delete input.driver_id;
    delete input.action_id;

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

    //Get the driver
    let selected_driver_response = await client.connector.get({
      driverKey: "replaceDriver",
    });
    let selected_driver_actions = selected_driver_response.actions; //get the driver's actions
    let filteredActionArray = [];
    //get the selected driver action
    if (selected_driver_actions) {
      filteredActionArray = selected_driver_actions.filter(
        (action) => action.key === bundle.inputData.action_id
      );
      //if found, should be single item array
      if (filteredActionArray.length >= 0) {
        let selected_action = filteredActionArray[0];
        //get actions input fields, https://docs.google.com/document/d/14arNus32sKeovhfmVbGncXA6F93mdWix-cGm8RxoyL0/edit#heading=h.t91p0v8eq5q8
        step = {
          type: "action", //always action
          connector: driver_id,
          operation: bundle.inputData.action_id,
        };
        z.console.log("Step Object: ", step); //DEBUG log to confirm correct structure
        if (selected_action.operation.inputFields.length >= 1) {
          selected_action.operation.inputFields.map((field) => {
            if (field.computed === true) {
              input = {
                [field.key]: field.default,
                ...input,
              };
            } else {
              input = {
                [field.key]: bundle.inputData[field.key]
                  ? bundle.inputData[field.key]
                  : field.default,
                ...input,
              };
            }
          }); //build the input object based on the fields available
          z.console.log("Input Object: ", input);
        }
      }

      let nexus_response;
      if (bundle.meta.isLoadingSample) {
        nexus_response = await client.connector.testAction({
          step,
          input: { _grinderyChain: chain, ...input },
          environment: ENVIRONMENT,
          source: workflowSource[ENVIRONMENT] || workflowSource[0],
        });
      } else {
        const callbackUrl = z.generateCallbackUrl();

        nexus_response = await client.connector.runActionAsync({
          callbackUrl,
          step,
          input: { _grinderyChain: chain, ...input },
          environment: ENVIRONMENT,
        });

        //const nexus_response = await client.runAction(step, input); //optional string 'staging'
        z.console.log("Response from runAction: ", nexus_response);
      }
      if (nexus_response) {
        return nexus_response;
      }
    }
  } catch (error) {
    if (error.message === "Invalid access token") {
      z.console.log(
        "Line 56 - Auth Error in run_grindery_action",
        error.message
      );
      throw new z.errors.RefreshAuthError();
    } else {
      z.console.log("Error in run_grindery_action: ", error.message);
    }
  }
};

const performResumeAction = async (z, bundle) => {
  z.console.log(
    "Response from runActionAsync callback: ",
    bundle.cleanedRequest
  );
  if (
    bundle.cleanedRequest &&
    bundle.cleanedRequest.success &&
    bundle.cleanedRequest.result
  ) {
    return bundle.cleanedRequest.result;
  } else {
    throw new z.errors.Error(bundle.cleanedRequest.error || "Unknown error");
  }
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#createschema
  key: "replaceActionCamelCase",
  noun: "replaceActionTitleCase",

  display: {
    label: "replaceLabelAction",
    description: "replaceDescription",
  },

  operation: {
    perform,
    performResume: performResumeAction,
    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. They're optional.
    // End-users will map data into these fields. In general, they should have any fields that the API can accept. Be sure to accurately mark which fields are required!
    inputFields: [
      {
        key: "action_id",
        label: "Driver Action",
        type: "string",
        required: true,
        altersDynamicFields: true,
        dynamic: "replaceActionCamelCase_action_hidden.key",
      },
      async function (z, bundle) {
        try {
          const client = new NexusClient(bundle.authData.access_token);
          let response = await client.connector.get({
            driverKey: "replaceDriver",
          });
          //z.console.log("listing driver details: ", response);
          let driver_actions = response.actions; //match the selected driver
          let choices = {};
          let choices2 = [];
          let actionsInputField = [];
          if (driver_actions) {
            //if driver has actions
            //get the selected action
            let this_selected_action = driver_actions.filter(
              (action) => action.key === bundle.inputData.action_id
            );
            let inputFields = [];
            if (this_selected_action.length >= 0) {
              //DEBUG MESSAGE
              z.console.log(
                "User selected action is: ",
                this_selected_action[0]
              );
              if (this_selected_action[0].operation.inputFields.length >= 1) {
                if (
                  response.authentication &&
                  response.authentication.type === "oauth2" &&
                  this_selected_action[0].authentication !== "none"
                ) {
                  const user = client.user.get();
                  const credentials = await client.credentials.list({
                    connectorId: "replaceDriver",
                    environment: "production",
                  });
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

                  actionsInputField.push(credentialsField);

                  if (
                    bundle.inputData.auth_credentials &&
                    bundle.inputData.auth_credentials === "add_new"
                  ) {
                    const authLink = `https://orchestrator.grindery.org/credentials/staging/replaceDriver/auth?access_token=${
                      bundle.authData.access_token
                    }&redirect_uri=https://flow.grindery.org/complete_auth/${
                      user.workspace || "default"
                    }`;

                    actionsInputField.push({
                      key: "auth_copy",
                      label: "Authentication",
                      type: "copy",
                      helpText: `Please, click the link and follow sign-in process: [Sign-in](${authLink}).`,
                    });
                    actionsInputField.push({
                      key: "auth_completed",
                      label: "I have completed the sign in flow",
                      type: "boolean",
                      default: "false",
                      helpText:
                        "Set to TRUE once you are done with authentication",
                      altersDynamicFields: true,
                    });

                    if (
                      bundle.inputData.auth_completed &&
                      bundle.inputData.auth_completed !== "false" &&
                      credentials.length > 0
                    ) {
                      actionsInputField.push({
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

                let filtered_action_fields =
                  this_selected_action[0].operation.inputFields.filter(
                    (action) => !action.computed
                  );
                filtered_action_fields.map((inputField) => {
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
                  //TODO, filter on input type, and whether required or not, translate the ui from Grindery to Zapier
                  let temp = {
                    key: inputField.key,
                    label: inputField.label,
                    helpText: inputField.helpText,
                    default: inputField.default,
                    type: type,
                  };
                  if (inputField.choices) {
                    inputField.choices.map((choice) => {
                      choices = {
                        [choice.value]: choice.label,
                        ...choices,
                      };
                    });
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
                  if (inputField.default) {
                    temp = {
                      default: inputField.default,
                      ...temp,
                    };
                  }
                  if (
                    response.authentication &&
                    response.authentication.type === "oauth2" &&
                    this_selected_action[0].authentication !== "none" &&
                    ((bundle.inputData.auth_credentials &&
                      bundle.inputData.auth_credentials === "add_new" &&
                      bundle.inputData.auth_completed &&
                      bundle.inputData.auth_completed !== "false") ||
                      (bundle.inputData.auth_credentials &&
                        bundle.inputData.auth_credentials !== "add_new"))
                  ) {
                    actionsInputField.push(temp);
                  } else {
                    if (
                      !response.authentication ||
                      response.authentication.type !== "oauth2" ||
                      this_selected_action[0].authentication === "none"
                    ) {
                      actionsInputField.push(temp);
                    }
                  }
                });
                inputFields = [...inputFields, ...actionsInputField];
              }
              return inputFields;
            }
          }
        } catch (error) {
          z.console.log(error.message);
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
      name: "Test",
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
