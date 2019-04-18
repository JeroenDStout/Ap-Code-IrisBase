/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"

#include "IrisBase/Pubc/Environment.h"

using namespace IrisBack::Core;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(Environment);

    //  Setup
    // --------------------

Environment::Environment()
{
}

Environment::~Environment()
{
}

    //  Control
    // --------------------

void Environment::internal_unload_all()
{
    this->RelayReceiverBaseClass::internal_unload_all();
}

    //  Util
    // --------------------

void Environment::internal_compile_stats(JSON & json)
{
    this->RelayReceiverBaseClass::internal_compile_stats(json);
}