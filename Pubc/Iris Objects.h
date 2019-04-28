/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#pragma once

#include "BlackRoot/Pubc/UUID.h"
#include "BlackRoot/Pubc/JSON.h"

#include "IrisBase/Pubc/Interface Layouts.h"

namespace IrisBack {
namespace Objects {

    struct Object {
        using JSON      = BlackRoot::Format::JSON;
        using UUID      = BlackRoot::Identify::UUID;
        using UUIDList  = std::vector<UUID>;

        UUID         ID;
        UUID         Parent_ID;
        UUIDList     Child_IDs;

        std::string  Base_Type_Name;
        JSON         Object_Description;
    };

}
}