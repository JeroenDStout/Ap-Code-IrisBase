/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
 
#include "BlackRoot/Pubc/Assert.h"

#include "IrisBase/Pubc/Iris Objectman.h"

using namespace IrisBack::Objects;

    //  Setup
    // --------------------

void Objectman::initialise()
{

}

void Objectman::deinitialise()
{

}

    //  Object manipulation
    // -----------------------

const Object * Objectman::find_by_name(std::string name)
{
    auto & it = this->Nickname_Map.find(name);
    if (it == this->Nickname_Map.end()) {
        return nullptr;
    }

    return this->get(it->second);
}

void Objectman::give_name(UUID id, std::string name)
{
    DbAssert(nullptr != this->get(id));
    this->Nickname_Map[name] = id;
}

const Object * Objectman::get(UUID id)
{
    auto & it = this->Object_Map.find(id);
    return &it->second;
}

const Object * Objectman::create(UUID parent_id, std::string type_name, JSON description)
{
    UUID id = BlackRoot::Identify::UUIDGenerator{}();

        // Add the element to the parent's child list, if needd
    if (!parent_id.is_nil()) {
        Object * parent = this->internal_get(parent_id);
        DbAssert(nullptr != parent);
        parent->Child_IDs.push_back(id);
    }

    Object & object = this->Object_Map[id];
    object.ID = id;
    object.Base_Type_Name = type_name;
    object.Object_Description = description;
    object.Parent_ID = parent_id;

    return &object;
}

const Object * Objectman::replace(UUID id, std::string type_name, JSON description)
{
    Object * obj = this->internal_get(id);
    DbAssert(nullptr != obj);

    obj->ID = id;
    obj->Base_Type_Name = type_name;
    obj->Object_Description = description;

    return obj;
}

    //  JSON
    // -----------------------

Objectman::JSON Objectman::get_json(UUID id)
{
    auto obj = this->get(id);
    if (nullptr == obj) {
        return {};
    }

    JSON ret;
    ret["base_type_name"] = obj->Base_Type_Name;
    ret["description"]    = obj->Object_Description;
    ret["parent"]         = BlackRoot::Identify::UUID_To_String(obj->Parent_ID);

    if (obj->Child_IDs.size() > 0) {
        JSON::array_t children_id;

        for (auto id : obj->Child_IDs) {
            children_id.push_back(BlackRoot::Identify::UUID_To_String(id));
        }

        ret["children"] = children_id;
    }

    return ret;
}

    //  Util
    // -----------------------

Object * Objectman::internal_get(UUID id)
{
    auto & it = this->Object_Map.find(id);
    if (it == this->Object_Map.end())
        return nullptr;
    return &it->second;
}