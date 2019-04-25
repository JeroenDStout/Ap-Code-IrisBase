/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"
#include "BlackRoot/Pubc/Threaded IO Stream.h"
#include "BlackRoot/Pubc/Exception.h"
#include "BlackRoot/Pubc/Sys Path.h"

#include "ToolboxBase/Pubc/Interface Environment.h"

#include "IrisBase/Pubc/Base Layouts.h"

using namespace IrisBack::Base;
namespace fs = std::experimental::filesystem;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(Layouts);
CON_RMR_REGISTER_FUNC(Layouts, conduit_connect_layouts);

    //  Setup
    // --------------------

void Layouts::initialise(const JSON param)
{
}

void Layouts::deinitialise(const JSON param)
{
}

    //  Connexions
    // --------------------

void Layouts::update_connexion_enumeration()
{
	this->Connextion_Enum.add_from_directory(this->Layout_Props.Setup_Dir / "Connexions");
}

void Layouts::_conduit_connect_layouts(Conduits::Raw::IRelayMessage * msg) noexcept
{

}

    //  Settings
    // --------------------

void Layouts::set_setup_dir(Path path)
{
    this->Layout_Props.Setup_Dir = Toolbox::Core::Get_Environment()->expand_dir(path);
	this->update_connexion_enumeration();
}

    //  Util
    // --------------------

Layouts::JSON Layouts::get_connexion_enumeration() const
{
	const auto & list = this->Connextion_Enum.get_connexions();

	JSON res = JSON::array();

	for (const auto & elem : list) {
		res.push_back({ { "name", elem.Name }, { "port", elem.Port }, { "icon", elem.Icon } });
	}

	return res;
}

Layouts::Path Layouts::get_setup_dir()
{
    return this->Layout_Props.Setup_Dir;
}