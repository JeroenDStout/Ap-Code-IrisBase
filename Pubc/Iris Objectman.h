/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#pragma once

#include "BlackRoot/Pubc/JSON.h"
#include "BlackRoot/Pubc/UUID.h"

#include "IrisBase/Pubc/Iris Objects.h"

namespace IrisBack {
namespace Objects {

    class Objectman {
    public:
        using JSON          = BlackRoot::Format::JSON;
        using UUID          = BlackRoot::Identify::UUID;
        using ObjectMap     = std::map<UUID, Object>;
        using NicknameMap   = std::map<std::string, UUID>;

    protected:
        ObjectMap       Object_Map;
        NicknameMap     Nickname_Map;

        Object * internal_get(UUID);
    public:
        void    initialise();
        void    deinitialise();

        const Object * find_by_name(std::string);
        void           give_name(UUID, std::string);

        const Object * get(UUID);

        const Object * create(UUID parent, std::string type_name, JSON description);
        const Object * replace(UUID current, std::string type_name, JSON description);

        JSON           get_json(UUID);
    };

}
}