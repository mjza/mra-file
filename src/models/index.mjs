'use strict';

import { createWriteStream, existsSync, truncateSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Sequelize, col, fn, where } from 'sequelize';
import initModels from './init-models.mjs';

/**
 * Logs a message to the sequelize log file.
 * @param {string} msg - The message to log.
 */
const logToFileStream = (msg) => {
  try {
    const filePath = join(process.cwd(), 'logs/sequelize.log');
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local-test') {
      if (!existsSync(filePath)) {
        writeFileSync(filePath, '');
      } else {
        truncateSync(filePath, 0);
      }
    }
    const logStream = createWriteStream(filePath, { flags: 'a' });
    logStream.write(msg + '\n');
  } catch (err) {
    console.error('Error creating or truncating log file:', err);
  }

};

/**
 * Sequelize instance configured for the application database.
 */
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  dialectOptions: {
    useUTC: true, // for reading from database
    ssl: process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'local-test' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
  },
  timezone: '+00:00', // for writing to database
  logging: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local-test' ? logToFileStream : false,
  hooks: {
    afterConnect: (connection, _) => {
      return new Promise((resolve, reject) => {
        connection.query("SET TIME ZONE 'UTC';", (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  },
});

/**
 * Database models initialized with Sequelize.
 */
const models = initModels(sequelize);

const {
  MraActions,
  MraAdvisorCustomers,
  MraAuditLogsFile,
  MraConditionFields,
  MraConditionTypes,
  MraContactCategories,
  MraContactInformation,
  MraContactTypes,
  MraCurrencyCodes,
  MraCustomerTypes,
  MraCustomers,
  MraDiscountInterval,
  MraDiscountTypes,
  MraGenderTypes,
  MraNotificationTypes,
  MraNotifications,
  MraPaymentDetails,
  MraPaymentMethods,
  MraPosts,
  MraRoles,
  MraStatuses,
  MraSubscriptionCodeOfCustomers,
  MraSubscriptionInterval,
  MraSubscriptionModelOptions,
  MraSubscriptionModels,
  MraSubscriptionOptions,
  MraSubscriptions,
  MraTables,
  MraTcAcceptance,
  MraTcTypes,
  MraTermsAndConditions,
  MraTicketAssignments,
  MraTicketCategories,
  MraTicketComments,
  MraTicketHistory,
  MraTicketReactionTypes,
  MraTicketReactions,
  MraTickets,
  MraTransitionConditions,
  MraUserCities,
  MraUserCustomers,
  MraUserDetails,
  MraUsers,
  MragCaAddresses,
  MragCities,
  MragCountries,
  MragWofCaGeojson,
  MragWofCaNames,
  MragWofCaSpr,
  MragWofGeometryTypes,
  MragWofNameContexts,
  MragWofPlaceTypes,
} = models;

/**
 * Closes the Sequelize database connection.
 * @returns {Promise<void>} A promise that resolves when the connection is closed.
 */
const closeSequelize = async () => {
  await sequelize.close();
};

export {
  MraActions,
  MraAdvisorCustomers,
  MraAuditLogsFile,
  MraConditionFields,
  MraConditionTypes,
  MraContactCategories,
  MraContactInformation,
  MraContactTypes,
  MraCurrencyCodes,
  MraCustomerTypes,
  MraCustomers,
  MraDiscountInterval,
  MraDiscountTypes,
  MraGenderTypes,
  MraNotificationTypes,
  MraNotifications,
  MraPaymentDetails,
  MraPaymentMethods,
  MraPosts,
  MraRoles,
  MraStatuses,
  MraSubscriptionCodeOfCustomers,
  MraSubscriptionInterval,
  MraSubscriptionModelOptions,
  MraSubscriptionModels,
  MraSubscriptionOptions,
  MraSubscriptions,
  MraTables,
  MraTcAcceptance,
  MraTcTypes,
  MraTermsAndConditions,
  MraTicketAssignments,
  MraTicketCategories,
  MraTicketComments,
  MraTicketHistory,
  MraTicketReactionTypes,
  MraTicketReactions,
  MraTickets,
  MraTransitionConditions,
  MraUserCities,
  MraUserCustomers,
  MraUserDetails,
  MraUsers,
  MragCaAddresses,
  MragCities,
  MragCountries,
  MragWofCaGeojson,
  MragWofCaNames,
  MragWofCaSpr,
  MragWofGeometryTypes,
  MragWofNameContexts,
  MragWofPlaceTypes, Sequelize, closeSequelize, col, fn, sequelize, where
};

