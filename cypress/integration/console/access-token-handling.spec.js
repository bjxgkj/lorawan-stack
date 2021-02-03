// Copyright © 2021 The Things Network Foundation, The Things Industries B.V.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import stringToHash from '../../../pkg/webui/lib/string-to-hash'

describe('Access token handling', () => {
  before(() => {
    cy.dropAndSeedDatabase()
  })

  beforeEach(() => {
    cy.loginConsole({ user_id: 'admin', password: 'admin' })
  })

  it('succeeds re-obtaining an access token', () => {
    const storageKey = `accessToken-${stringToHash('/console')}`

    cy.window().then(window => {
      // Remove the access token from local storage.
      window.localStorage.removeItem(storageKey)

      // Visit the Console and check whether the site loaded correctly (e.g.
      // no redirect to login page).
      cy.visit(`${Cypress.config('consoleRootPath')}`)
      cy.findByTestId('full-error-view').should('not.exist')

      // Check whether a new access token was stored.
      cy.get('header') // Wait until page has fully loaded.
      cy.window().then(window => {
        const tokenObject = JSON.parse(window.localStorage.getItem(storageKey))
        expect(tokenObject.access_token).to.exist
      })
    })
  })

  it('succeeds initiating a new console session', () => {
    const storageKey = `accessToken-${stringToHash('/console')}`

    cy.window().then(window => {
      // Remove the console session cookie and stored access token.
      cy.clearCookie('_console_auth')
      window.localStorage.removeItem(storageKey)

      // Visit the Console and check whether the site loaded correctly (e.g.
      // no redirect to login page).
      cy.visit(`${Cypress.config('consoleRootPath')}/applications`)
      cy.findByTestId('full-error-view').should('not.exist')

      // Check whether a new access token was stored.
      cy.get('header') // Wait until page has fully loaded.
      cy.location('pathname').should('eq', '/console/applications')
      cy.window().then(window => {
        const tokenObject = JSON.parse(window.localStorage.getItem(storageKey))
        expect(tokenObject.access_token).to.exist
      })
    })
  })

  it('succeeds redirecting to login when all sessions expired', () => {
    const storageKey = `accessToken-${stringToHash('/console')}`

    cy.window().then(window => {
      // Remove all session cookies and stored access token
      cy.clearCookies()
      window.localStorage.removeItem(storageKey)

      // Visit the Console and check whether the site redirected to the
      // Account App's login page.
      cy.visit(`${Cypress.config('consoleRootPath')}`)
      cy.findByTestId('full-error-view').should('not.exist')
      cy.location('pathname').should('include', `${Cypress.config('accountAppRootPath')}/login`)
      cy.location('search').should('include', 'authorize')
    })
  })

  it('succeeds refreshing the access token after expiry', () => {
    const storageKey = `accessToken-${stringToHash('/console')}`
    let tokenObject

    cy.window().then(window => {
      // Manipulate the access token object to make it appear expired.
      tokenObject = JSON.parse(window.localStorage.getItem(storageKey))
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 2)
      tokenObject.expiry = expiredDate.toISOString()
      window.localStorage.setItem(storageKey, JSON.stringify(tokenObject))

      // Visit the Console and check whether the site loaded correctly (e.g.
      // no redirect to login page).
      cy.visit(`${Cypress.config('consoleRootPath')}`)
      cy.findByTestId('full-error-view').should('not.exist')

      // Check whether a new access token was stored.
      cy.get('header') // Wait until page has fully loaded.
      cy.window().then(window => {
        const newTokenObject = JSON.parse(window.localStorage.getItem(storageKey))
        expect(newTokenObject.access_token).to.not.equal(tokenObject.access_token)
      })
    })
  })
})
